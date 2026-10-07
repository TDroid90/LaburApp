-- Account deletion requests stay pending for a 72-hour human review window.
alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('pending', 'processing', 'prepared', 'completed', 'failed', 'cancelled'));

alter table public.account_deletion_requests
  add column if not exists delete_after timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

create index if not exists account_deletion_requests_review_idx
  on public.account_deletion_requests (delete_after)
  where status in ('pending', 'failed');

revoke all on table public.account_deletion_requests from public, anon, authenticated;

-- Mark the account as pending and enqueue the review in one transaction.
create or replace function public.request_account_deletion(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_at timestamptz := now();
  delete_after_at timestamptz := requested_at + interval '72 hours';
begin
  if p_user_id is null then
    raise exception using message = 'USER_ID_REQUIRED';
  end if;
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if not exists (select 1 from public.profiles where id = p_user_id for update) then
    raise exception using message = 'ACCOUNT_NOT_FOUND';
  end if;
  update public.profiles
  set account_status = 'deletion_requested', updated_at = requested_at
  where id = p_user_id;
  insert into public.account_deletion_requests(
    user_id, status, attempts, requested_at, delete_after, last_error, reviewed_at, reviewed_by, updated_at
  ) values (
    p_user_id, 'pending', 1, requested_at, delete_after_at, null, null, null, requested_at
  )
  on conflict (user_id) do update set
    status = 'pending', attempts = 1, requested_at = excluded.requested_at,
    delete_after = excluded.delete_after, last_error = null,
    reviewed_at = null, reviewed_by = null, updated_at = excluded.updated_at;
  return delete_after_at;
end;
$$;

revoke all on function public.request_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.request_account_deletion(uuid) to service_role;

create or replace function public.cancel_account_deletion(p_user_id uuid, p_reviewed_by text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if p_user_id is null or nullif(trim(p_reviewed_by), '') is null then
    raise exception using message = 'REVIEWER_REQUIRED';
  end if;
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select status into current_status from public.account_deletion_requests where user_id = p_user_id for update;
  if current_status not in ('pending', 'failed') then return false; end if;
  update public.account_deletion_requests
  set status = 'cancelled', reviewed_at = now(), reviewed_by = p_reviewed_by,
      last_error = null, updated_at = now()
  where user_id = p_user_id;
  update public.profiles
  set account_status = 'active', updated_at = now()
  where id = p_user_id and account_status = 'deletion_requested';
  return found;
end;
$$;

revoke all on function public.cancel_account_deletion(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_account_deletion(uuid, text) to service_role;
