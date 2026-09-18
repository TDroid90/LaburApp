-- El QR acredita la finalización. Sin comprobante, requiere confirmación del prestador.
create table if not exists public.completion_confirmations (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  request_id uuid not null unique references public.service_requests(id) on delete cascade,
  client_id uuid not null references public.profiles(id),
  provider_id uuid not null references public.profiles(id),
  receipt_path text unique,
  status text not null check (status in ('awaiting_provider', 'completed')),
  drive_sync_status text check (drive_sync_status in ('pending', 'processing', 'synced', 'failed')),
  drive_file_id text,
  submitted_at timestamptz not null default now(),
  provider_confirmed_at timestamptz
);
alter table public.completion_confirmations enable row level security;
create policy "participantes ven confirmacion" on public.completion_confirmations for select to authenticated
using (client_id = auth.uid() or provider_id = auth.uid() or public.has_role('admin'));
create policy "prestador ve comprobante de finalizacion" on storage.objects for select to authenticated
using (bucket_id = 'private-receipts' and exists (
  select 1 from public.completion_confirmations cc
  where cc.receipt_path = name and cc.provider_id = auth.uid()
));

create or replace function public.confirm_completion_token(raw_token text, receipt_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare selected_token public.completion_tokens;
declare selected_job public.jobs;
declare completed_now timestamptz := now();
begin
  select * into selected_token from public.completion_tokens
  where token_hash = encode(extensions.digest(upper(trim(raw_token)), 'sha256'), 'hex')
    and used_at is null and expires_at > now() for update;
  if not found then raise exception using message = 'INVALID_OR_EXPIRED_QR'; end if;
  select * into selected_job from public.jobs where id = selected_token.job_id for update;
  if selected_job.client_id <> auth.uid() then raise exception using message = 'QR_NOT_FOR_CLIENT'; end if;
  if selected_job.status <> 'client_confirmation_pending' then raise exception using message = 'JOB_NOT_AWAITING_QR'; end if;
  if receipt_path is not null then
    if receipt_path not like auth.uid()::text || '/completion/%' or not exists (
      select 1 from storage.objects so where so.bucket_id = 'private-receipts' and so.name = receipt_path
    ) then raise exception using message = 'INVALID_RECEIPT'; end if;
  end if;

  update public.completion_tokens set used_at = completed_now where id = selected_token.id;
  insert into public.completion_confirmations(job_id, request_id, client_id, provider_id, receipt_path, status, drive_sync_status)
  values(selected_job.id, selected_job.request_id, selected_job.client_id, selected_job.provider_id, receipt_path,
    case when receipt_path is null then 'awaiting_provider' else 'completed' end,
    case when receipt_path is null then null else 'pending' end);
  if receipt_path is not null then
    update public.jobs set status = 'completed', completion_verified_at = completed_now,
      completed_counted_at = coalesce(completed_counted_at, completed_now), updated_at = completed_now
    where id = selected_job.id;
    update public.service_requests set status = 'completed', completion_verified_at = completed_now
    where id = selected_job.request_id;
  end if;
  return selected_job.request_id;
end $$;

-- Clientes antiguos no pueden saltar la confirmación del prestador llamando al RPC anterior.
create or replace function public.confirm_completion_token(raw_token text) returns uuid
language sql security definer set search_path = '' as $$
  select public.confirm_completion_token(raw_token, null::text);
$$;

create or replace function public.provider_confirm_completion(target_job_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare selected public.completion_confirmations;
declare completed_now timestamptz := now();
begin
  select * into selected from public.completion_confirmations
  where job_id = target_job_id and provider_id = auth.uid() and status = 'awaiting_provider' for update;
  if not found then raise exception using message = 'CONFIRMATION_NOT_PENDING'; end if;
  update public.completion_confirmations set status = 'completed', provider_confirmed_at = completed_now
  where job_id = target_job_id;
  update public.jobs set status = 'completed', completion_verified_at = completed_now,
    completed_counted_at = coalesce(completed_counted_at, completed_now), updated_at = completed_now
  where id = target_job_id;
  update public.service_requests set status = 'completed', completion_verified_at = completed_now
  where id = selected.request_id;
  return selected.request_id;
end $$;
revoke all on function public.confirm_completion_token(text, text) from public;
revoke all on function public.provider_confirm_completion(uuid) from public;
grant execute on function public.confirm_completion_token(text, text) to authenticated;
grant execute on function public.provider_confirm_completion(uuid) to authenticated;

drop policy if exists "titular solicita copia de comprobantes" on public.receipt_drive_outbox;
create policy "titular solicita copia de comprobantes" on public.receipt_drive_outbox for insert to authenticated
with check (owner_id = auth.uid() and source_storage_path like auth.uid()::text || '/%'
  and target_relative_path not like '%..%' and status = 'pending' and attempts = 0
  and drive_file_id is null and (
    (receipt_kind = 'subscription' and exists (
      select 1 from public.subscription_requests sr
      where sr.client_id = auth.uid() and sr.receipt_path = source_storage_path
    )) or
    (receipt_kind = 'completion' and exists (
      select 1 from public.completion_confirmations cc
      where cc.client_id = auth.uid() and cc.receipt_path = source_storage_path
    ))
  ));
