alter table public.profiles alter column city drop not null;
alter table public.provider_profiles
  add column if not exists trade_title text check (char_length(trade_title) <= 120),
  add column if not exists skills_text text check (char_length(skills_text) <= 500);

create table if not exists public.provider_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  caption text check (char_length(caption) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'available' check (status in ('available','reserved','blocked')),
  request_id uuid references public.service_requests(id) on delete set null,
  approximate_zone text,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  token text not null unique,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null check (char_length(title) <= 160),
  body text not null check (char_length(body) <= 600),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  opened_by uuid not null references public.profiles(id),
  reason text not null check (char_length(reason) between 10 and 2000),
  status text not null default 'open' check (status in ('open','under_review','resolved_client','resolved_provider','closed')),
  resolution text check (char_length(resolution) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed')),
  provider_reference text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_profiles_discovery_idx on public.provider_profiles (published, completed_jobs desc, rating desc, created_at desc);
create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists requests_participants_idx on public.service_requests (client_id, provider_id, created_at desc);
create index if not exists messages_request_created_idx on public.messages (request_id, created_at);
create index if not exists availability_provider_starts_idx on public.provider_availability (provider_id, starts_at);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.provider_portfolio_items enable row level security;
alter table public.provider_availability enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.payment_disputes enable row level security;
alter table public.payment_refunds enable row level security;

create policy "identidad prestador publicada" on public.profiles for select using (
  id = auth.uid() or public.has_role('admin') or exists (select 1 from public.provider_profiles pp where pp.user_id = profiles.id and pp.published)
);
create policy "portfolio publicado" on public.provider_portfolio_items for select using (
  provider_id = auth.uid() or public.has_role('admin') or exists (select 1 from public.provider_profiles pp where pp.user_id = provider_id and pp.published)
);
create policy "prestador administra portfolio" on public.provider_portfolio_items for all to authenticated using (provider_id = auth.uid() or public.has_role('admin')) with check (provider_id = auth.uid() or public.has_role('admin'));
create policy "disponibilidad publicada" on public.provider_availability for select using (
  provider_id = auth.uid() or public.has_role('admin') or (status = 'available' and exists (select 1 from public.provider_profiles pp where pp.user_id = provider_id and pp.published))
);
create policy "prestador administra disponibilidad" on public.provider_availability for all to authenticated using (provider_id = auth.uid() or public.has_role('admin')) with check (provider_id = auth.uid() or public.has_role('admin'));
create policy "usuario administra push" on public.push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "usuario ve notificaciones" on public.notifications for select to authenticated using (user_id = auth.uid() or public.has_role('admin'));
create policy "usuario marca notificaciones" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "participantes ven disputas" on public.payment_disputes for select to authenticated using (exists (select 1 from public.jobs j where j.id = job_id and (j.client_id = auth.uid() or j.provider_id = auth.uid())) or public.has_role('admin'));
create policy "participantes abren disputas" on public.payment_disputes for insert to authenticated with check (opened_by = auth.uid() and exists (select 1 from public.jobs j where j.id = job_id and (j.client_id = auth.uid() or j.provider_id = auth.uid())));
create policy "admin resuelve disputas" on public.payment_disputes for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "participantes ven reintegros" on public.payment_refunds for select to authenticated using (exists (select 1 from public.payments p join public.jobs j on j.id = p.job_id where p.id = payment_id and (j.client_id = auth.uid() or j.provider_id = auth.uid())) or public.has_role('admin'));
create policy "participantes ven presupuestos" on public.quotes for select to authenticated using (exists (select 1 from public.service_requests r where r.id = request_id and (r.client_id = auth.uid() or r.provider_id = auth.uid())) or public.has_role('admin'));
create policy "prestador crea presupuestos" on public.quotes for insert to authenticated with check (exists (select 1 from public.service_requests r where r.id = request_id and r.provider_id = auth.uid()));
create policy "participantes ven eventos" on public.job_events for select to authenticated using (exists (select 1 from public.jobs j where j.id = job_id and (j.client_id = auth.uid() or j.provider_id = auth.uid())) or public.has_role('admin'));
create policy "participantes ven pagos" on public.payments for select to authenticated using (exists (select 1 from public.jobs j where j.id = job_id and (j.client_id = auth.uid() or j.provider_id = auth.uid())) or public.has_role('admin'));
create policy "cliente crea resena verificada" on public.reviews for insert to authenticated with check (client_id = auth.uid() and exists (select 1 from public.jobs j where j.id = job_id and j.client_id = auth.uid() and j.provider_id = provider_id and j.status = 'funds_released'));
create policy "admin ve auditoria" on public.audit_logs for select to authenticated using (public.has_role('admin'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare requested_role public.app_role;
declare requested_city text;
begin
  requested_role := case when new.raw_user_meta_data->>'role' = 'provider' then 'provider'::public.app_role else 'client'::public.app_role end;
  requested_city := case when new.raw_user_meta_data->>'city' in ('Río Grande','Ushuaia','Tolhuin') then new.raw_user_meta_data->>'city' else null end;
  insert into public.profiles(id, full_name, city)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)), requested_city)
  on conflict(id) do nothing;
  insert into public.user_roles(user_id, role) values(new.id, requested_role) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop policy if exists "fotos publicas" on storage.objects;
create policy "fotos publicas" on storage.objects for select using (bucket_id in ('avatars','portfolio'));
drop policy if exists "usuario carga avatar" on storage.objects;
create policy "usuario carga avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "prestador carga portfolio" on storage.objects;
create policy "prestador carga portfolio" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "documentos privados propios" on storage.objects;
create policy "documentos privados propios" on storage.objects for all to authenticated using (bucket_id = 'private-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('admin') or public.has_role('moderator'))) with check (bucket_id = 'private-documents' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.sheet_mirror_outbox drop constraint if exists sheet_mirror_outbox_tab_check;
alter table public.sheet_mirror_outbox add constraint sheet_mirror_outbox_tab_check check (tab in ('Usuarios','Profesionales','Contactos','Presupuestos','Trabajos','Reseñas','Pagos','Agenda','Auditoría'));

create or replace function public.enqueue_sheet_mirror() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_tab text;
begin
  target_tab := case TG_TABLE_NAME
    when 'profiles' then 'Usuarios'
    when 'provider_profiles' then 'Profesionales'
    when 'service_requests' then 'Contactos'
    when 'quotes' then 'Presupuestos'
    when 'jobs' then 'Trabajos'
    when 'reviews' then 'Reseñas'
    when 'payments' then 'Pagos'
    when 'provider_availability' then 'Agenda'
    when 'audit_logs' then 'Auditoría'
  end;
  insert into public.sheet_mirror_outbox(tab, entity_type, entity_id, operation, payload)
  values(target_tab, TG_TABLE_NAME, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id'), TG_OP, to_jsonb(new));
  return new;
end $$;

drop trigger if exists provider_profiles_sheet_mirror on public.provider_profiles;
create trigger provider_profiles_sheet_mirror after insert or update on public.provider_profiles for each row execute function public.enqueue_sheet_mirror();
drop trigger if exists jobs_sheet_mirror on public.jobs;
create trigger jobs_sheet_mirror after insert or update on public.jobs for each row execute function public.enqueue_sheet_mirror();
drop trigger if exists reviews_sheet_mirror on public.reviews;
create trigger reviews_sheet_mirror after insert or update on public.reviews for each row execute function public.enqueue_sheet_mirror();
drop trigger if exists payments_sheet_mirror on public.payments;
create trigger payments_sheet_mirror after insert or update on public.payments for each row execute function public.enqueue_sheet_mirror();
drop trigger if exists availability_sheet_mirror on public.provider_availability;
create trigger availability_sheet_mirror after insert or update on public.provider_availability for each row execute function public.enqueue_sheet_mirror();
drop trigger if exists audit_sheet_mirror on public.audit_logs;
create trigger audit_sheet_mirror after insert on public.audit_logs for each row execute function public.enqueue_sheet_mirror();
