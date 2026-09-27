-- Account deletion keeps contractual/financial structure under a tombstone
-- profile while deleting or anonymizing user-owned personal data. The Edge
-- Function removes Storage first and Auth last.
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.profiles drop constraint if exists profiles_id_fkey;

create table if not exists public.account_deletion_requests (
  user_id uuid primary key,
  status text not null default 'processing' check (status in ('processing', 'prepared', 'completed', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  requested_at timestamptz not null default now(),
  prepared_at timestamptz,
  completed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;

create table if not exists public.drive_cleanup_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  root_kind text not null check (root_kind in ('project', 'professionals')),
  drive_file_id text,
  relative_path text,
  fingerprint text generated always as (
    user_id::text || ':' || root_kind || ':' || coalesce(drive_file_id, '') || ':' || coalesce(relative_path, '')
  ) stored,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drive_cleanup_target_present check (drive_file_id is not null or relative_path is not null),
  constraint drive_cleanup_outbox_fingerprint_key unique (fingerprint)
);
alter table public.drive_cleanup_outbox enable row level security;

create or replace function public.prepare_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles%rowtype;
  affected_requests uuid[];
  affected_jobs uuid[];
begin
  if p_user_id is null then
    raise exception using message = 'USER_ID_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into profile_row from public.profiles where id = p_user_id for update;
  if profile_row.id is null then
    raise exception using message = 'ACCOUNT_NOT_FOUND';
  end if;

  insert into public.account_deletion_requests(user_id, status, attempts, requested_at, last_error, updated_at)
  values (p_user_id, 'processing', 1, now(), null, now())
  on conflict (user_id) do update
    set status = 'processing', attempts = public.account_deletion_requests.attempts + 1,
        last_error = null, updated_at = now();

  select coalesce(array_agg(id), '{}'::uuid[]) into affected_requests
  from public.service_requests where client_id = p_user_id or provider_id = p_user_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into affected_jobs
  from public.jobs where client_id = p_user_id or provider_id = p_user_id;

  -- Queue known Drive objects before their application rows are removed.
  insert into public.drive_cleanup_outbox(user_id, root_kind, drive_file_id, relative_path)
  select p_user_id, 'professionals', nullif(drive_file_id, ''), nullif(drive_folder_path, '')
  from public.provider_portfolio_items
  where provider_id = p_user_id and (drive_file_id is not null or drive_folder_path is not null)
  on conflict (fingerprint) do nothing;
  insert into public.drive_cleanup_outbox(user_id, root_kind, drive_file_id, relative_path)
  select p_user_id, 'project', nullif(drive_file_id, ''), null
  from public.client_request_attachments
  where client_id = p_user_id and drive_file_id is not null
  on conflict (fingerprint) do nothing;
  insert into public.drive_cleanup_outbox(user_id, root_kind, drive_file_id, relative_path)
  select p_user_id, 'project', nullif(drive_file_id, ''), null
  from public.subscription_requests
  where client_id = p_user_id and drive_file_id is not null
  on conflict (fingerprint) do nothing;
  insert into public.drive_cleanup_outbox(user_id, root_kind, drive_file_id, relative_path)
  select p_user_id, 'project', nullif(drive_file_id, ''), null
  from public.completion_confirmations
  where (client_id = p_user_id or provider_id = p_user_id) and drive_file_id is not null
  on conflict (fingerprint) do nothing;
  insert into public.drive_cleanup_outbox(user_id, root_kind, drive_file_id, relative_path)
  select p_user_id,
         case when d.table_name = 'drive_media_outbox' then 'professionals' else 'project' end,
         nullif(d.drive_file_id, ''), nullif(d.target_relative_path, '')
  from (
    select 'drive_media_outbox'::text as table_name, drive_file_id, target_relative_path
    from public.drive_media_outbox where provider_id = p_user_id
    union all
    select 'client_drive_media_outbox', drive_file_id, target_relative_path
    from public.client_drive_media_outbox where client_id = p_user_id
    union all
    select 'receipt_drive_outbox', drive_file_id, target_relative_path
    from public.receipt_drive_outbox where owner_id = p_user_id
  ) d
  where d.drive_file_id is not null or d.target_relative_path is not null
  on conflict (fingerprint) do nothing;

  -- Ephemeral/private account data is deleted.
  delete from public.messages where request_id = any(affected_requests);
  delete from public.completion_tokens where job_id = any(affected_jobs);
  delete from public.notifications where user_id = p_user_id;
  delete from public.push_tokens where user_id = p_user_id;
  delete from public.user_roles where user_id = p_user_id;
  delete from public.client_memberships where client_id = p_user_id;
  delete from public.provider_memberships where provider_id = p_user_id;
  delete from public.provider_followers where provider_id = p_user_id or follower_id = p_user_id;
  delete from public.provider_availability where provider_id = p_user_id;
  delete from public.provider_quote_templates where provider_id = p_user_id;
  delete from public.provider_rate_items where provider_id = p_user_id;
  delete from public.provider_service_offers where provider_id = p_user_id;
  delete from public.provider_services where provider_id = p_user_id;
  delete from public.credentials where provider_id = p_user_id;
  delete from public.provider_portfolio_items where provider_id = p_user_id;
  delete from public.provider_completed_works where provider_id = p_user_id;
  delete from public.provider_profiles where user_id = p_user_id;
  delete from public.client_request_attachments where client_id = p_user_id;
  delete from public.drive_media_outbox where provider_id = p_user_id;
  delete from public.client_drive_media_outbox where client_id = p_user_id;
  delete from public.receipt_drive_outbox where owner_id = p_user_id;
  delete from public.sheet_mirror_outbox
  where entity_id = p_user_id::text or payload::text like '%' || p_user_id::text || '%';

  -- Retained business records lose free-form personal content.
  update public.service_requests
  set description = 'Cuenta eliminada', approximate_zone = null, desired_at = null,
      preferred_start_time = null, preferred_end_time = null,
      cancellation_reason = case when cancellation_reason is null then null else cancellation_reason end
  where client_id = p_user_id;
  update public.quotes
  set scope = 'Presupuesto de cuenta eliminada', items = '[]'::jsonb, eta = null, notes = null
  where request_id in (select id from public.service_requests where provider_id = p_user_id);
  update public.reviews set comment = null, qualities = '{}'::text[]
  where client_id = p_user_id or provider_id = p_user_id;
  update public.reports set details = null where reporter_id = p_user_id or target_id = p_user_id;
  update public.payment_disputes
  set reason = 'Cuenta eliminada', resolution = case when resolution is null then null else 'Cuenta eliminada' end
  where opened_by = p_user_id or job_id = any(affected_jobs);
  update public.completion_confirmations
  set receipt_path = null, drive_file_id = null, drive_sync_status = null
  where client_id = p_user_id or provider_id = p_user_id;
  update public.subscription_requests
  set receipt_path = 'deleted/' || id::text, drive_file_id = null, drive_sync_status = 'failed'
  where client_id = p_user_id;
  update public.credentials set reviewed_by = null where reviewed_by = p_user_id;
  update public.subscription_requests set approved_by = null where approved_by = p_user_id;
  update public.job_events set actor_id = null, metadata = '{}'::jsonb where actor_id = p_user_id;
  update public.audit_logs
  set actor_id = null, before_data = null, after_data = null, reason = null
  where actor_id = p_user_id or target_id = p_user_id::text
     or coalesce(before_data::text, '') like '%' || p_user_id::text || '%'
     or coalesce(after_data::text, '') like '%' || p_user_id::text || '%';

  update public.profiles
  set full_name = 'Cuenta eliminada', city = null, avatar_path = null,
      account_status = 'deleted', must_change_password = false,
      deleted_at = coalesce(deleted_at, now()), updated_at = now()
  where id = p_user_id;

  update public.account_deletion_requests
  set status = 'prepared', prepared_at = coalesce(prepared_at, now()), updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('prepared', true, 'user_id', p_user_id);
exception when others then
  update public.account_deletion_requests
  set status = 'failed', last_error = sqlstate, updated_at = now()
  where user_id = p_user_id;
  raise;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
revoke all on table public.account_deletion_requests from anon, authenticated;
revoke all on table public.drive_cleanup_outbox from anon, authenticated;
