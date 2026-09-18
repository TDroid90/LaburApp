-- Solicitudes de suscripción por transferencia. El comprobante no activa Premium.
create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  plan_months integer not null check (plan_months in (1, 3, 6, 12)),
  amount_ars integer not null check (amount_ars > 0),
  receipt_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  drive_sync_status text not null default 'pending' check (drive_sync_status in ('pending', 'processing', 'synced', 'failed')),
  drive_file_id text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint subscription_amount_matches_plan check (
    (plan_months = 1 and amount_ars = 3500) or
    (plan_months = 3 and amount_ars = 7500) or
    (plan_months = 6 and amount_ars = 12000) or
    (plan_months = 12 and amount_ars = 15000)
  )
);
create index if not exists subscription_requests_client_created_idx on public.subscription_requests(client_id, created_at desc);
alter table public.subscription_requests enable row level security;
create policy "titular y admin ven suscripciones" on public.subscription_requests for select to authenticated
using (client_id = auth.uid() or public.has_role('admin'));
create policy "titular solicita suscripcion" on public.subscription_requests for insert to authenticated
with check (client_id = auth.uid() and status = 'pending' and approved_at is null and approved_by is null
  and drive_sync_status = 'pending' and drive_file_id is null
  and receipt_path like auth.uid()::text || '/subscription/%');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('private-receipts', 'private-receipts', false, 3145728, array['image/jpeg'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy "titular carga comprobantes" on storage.objects for insert to authenticated
with check (bucket_id = 'private-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "titular y admin leen comprobantes" on storage.objects for select to authenticated
using (bucket_id = 'private-receipts' and (
  (storage.foldername(name))[1] = auth.uid()::text or public.has_role('admin')
));

create table if not exists public.receipt_drive_outbox (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  receipt_kind text not null check (receipt_kind in ('subscription', 'completion')),
  source_storage_path text not null unique,
  target_root_folder_id text not null default '1Y8lNj4zpDXRA_ASUn0GCRmbtI9TE2QfI',
  target_relative_path text not null,
  target_file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'synced', 'failed')),
  attempts integer not null default 0,
  drive_file_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipt_drive_root check (target_root_folder_id = '1Y8lNj4zpDXRA_ASUn0GCRmbtI9TE2QfI')
);
alter table public.receipt_drive_outbox enable row level security;
create policy "titular ve copia de comprobantes" on public.receipt_drive_outbox for select to authenticated
using (owner_id = auth.uid() or public.has_role('admin'));
create policy "titular solicita copia de comprobantes" on public.receipt_drive_outbox for insert to authenticated
with check (owner_id = auth.uid() and source_storage_path like auth.uid()::text || '/%'
  and target_relative_path not like '%..%' and status = 'pending' and attempts = 0
  and drive_file_id is null and (
    receipt_kind = 'subscription' and exists (
      select 1 from public.subscription_requests sr
      where sr.client_id = auth.uid() and sr.receipt_path = source_storage_path
    )
  ));

create or replace function public.admin_set_premium_by_public_id(target_public_id text, enable_premium boolean)
returns table(client_id uuid, plan_code text, period_ends_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
declare pending_request public.subscription_requests;
declare next_end timestamptz;
begin
  if not public.has_role('admin') then raise exception using message = 'ADMIN_REQUIRED'; end if;
  select id into target_id from public.profiles where public_id = trim(target_public_id);
  if target_id is null then raise exception using message = 'ACCOUNT_NOT_FOUND'; end if;
  if enable_premium then
    select * into pending_request from public.subscription_requests
    where subscription_requests.client_id = target_id and status = 'pending'
    order by created_at desc limit 1 for update;
    next_end := greatest(now(), coalesce((select cm.current_period_ends_at from public.client_memberships cm where cm.client_id = target_id), now()))
      + make_interval(months => coalesce(pending_request.plan_months, 1));
    insert into public.client_memberships(client_id, plan_code, status, current_period_ends_at)
    values(target_id, 'plus', 'active', next_end)
    on conflict(client_id) do update set plan_code = 'plus', status = 'active', current_period_ends_at = next_end, updated_at = now();
    if pending_request.id is not null then
      update public.subscription_requests set status = 'approved', approved_at = now(), approved_by = auth.uid()
      where id = pending_request.id;
    end if;
  else
    update public.client_memberships set plan_code = 'free', status = 'cancelled', current_period_ends_at = now(), updated_at = now()
    where client_memberships.client_id = target_id;
  end if;
  insert into public.audit_logs(actor_id, action, target_type, target_id, reason)
  values(auth.uid(), case when enable_premium then 'premium_enabled' else 'premium_disabled' end,
    'client_membership', target_id::text, case when pending_request.id is not null then pending_request.id::text else 'manual' end);
  return query select cm.client_id, cm.plan_code, cm.current_period_ends_at
    from public.client_memberships cm where cm.client_id = target_id;
end $$;
revoke all on function public.admin_set_premium_by_public_id(text, boolean) from public;
grant execute on function public.admin_set_premium_by_public_id(text, boolean) to authenticated;
