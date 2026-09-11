create or replace function public.issue_completion_token(target_job_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare raw_token text;
declare target_request_id uuid;
begin
  select j.request_id into target_request_id
  from public.jobs j
  where j.id = target_job_id and j.provider_id = auth.uid()
    and j.status in ('quote_accepted','payment_pending','payment_authorized','funds_held','scheduled','in_progress','completion_proposed','client_confirmation_pending')
  for update;
  if not found then raise exception using message = 'JOB_NOT_COMPLETABLE'; end if;

  raw_token := upper(substr(encode(extensions.gen_random_bytes(9), 'hex'), 1, 12));
  update public.completion_tokens set used_at = now()
  where job_id = target_job_id and used_at is null;
  insert into public.completion_tokens(job_id, token_hash, expires_at)
  values(target_job_id, encode(extensions.digest(raw_token, 'sha256'), 'hex'), now() + interval '15 minutes');

  update public.jobs
  set status = 'client_confirmation_pending', updated_at = now()
  where id = target_job_id;
  update public.service_requests
  set status = 'client_confirmation_pending'
  where id = target_request_id;
  return raw_token;
end $$;

create or replace function public.confirm_completion_token(raw_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare selected_token public.completion_tokens;
declare selected_job public.jobs;
begin
  select * into selected_token from public.completion_tokens
  where token_hash = encode(extensions.digest(upper(trim(raw_token)), 'sha256'), 'hex')
    and used_at is null and expires_at > now()
  for update;
  if not found then raise exception using message = 'INVALID_OR_EXPIRED_QR'; end if;
  select * into selected_job from public.jobs where id = selected_token.job_id for update;
  if selected_job.client_id <> auth.uid() then raise exception using message = 'QR_NOT_FOR_CLIENT'; end if;

  update public.completion_tokens set used_at = now() where id = selected_token.id;
  update public.jobs
  set status = 'completed', completion_verified_at = now(), completed_counted_at = coalesce(completed_counted_at, now()), updated_at = now()
  where id = selected_job.id;
  update public.service_requests
  set status = 'completed', completion_verified_at = now()
  where id = selected_job.request_id;
  return selected_job.request_id;
end $$;

revoke all on function public.issue_completion_token(uuid) from public;
revoke all on function public.confirm_completion_token(text) from public;
grant execute on function public.issue_completion_token(uuid) to authenticated;
grant execute on function public.confirm_completion_token(text) to authenticated;
