create sequence if not exists public.provider_public_id_seq start with 1;

alter table public.profiles add column if not exists public_id text;

update public.profiles
set public_id = 'LP' || lpad(nextval('public.provider_public_id_seq')::text, 6, '0')
where public_id is null;

alter table public.profiles
  alter column public_id set default ('LP' || lpad(nextval('public.provider_public_id_seq')::text, 6, '0')),
  alter column public_id set not null;

create unique index if not exists profiles_public_id_unique on public.profiles(public_id);

alter table public.profiles drop constraint if exists profiles_city_check;
alter table public.profiles add constraint profiles_city_check
check (city is null or city in ('San Sebastián', 'Río Grande', 'Tolhuin', 'Almanza', 'Ushuaia'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare requested_role public.app_role;
declare requested_city text;
begin
  requested_role := case when new.raw_user_meta_data->>'role' = 'provider' then 'provider'::public.app_role else 'client'::public.app_role end;
  requested_city := case when new.raw_user_meta_data->>'city' in ('San Sebastián', 'Río Grande', 'Tolhuin', 'Almanza', 'Ushuaia') then new.raw_user_meta_data->>'city' else null end;
  insert into public.profiles(id, full_name, city)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)), requested_city)
  on conflict(id) do nothing;
  insert into public.user_roles(user_id, role) values(new.id, requested_role) on conflict do nothing;
  return new;
end $$;

alter table public.provider_service_offers
  add column if not exists specializations text[] not null default '{}';

update public.provider_service_offers
set specializations = array[specialization]
where cardinality(specializations) = 0;

alter table public.provider_service_offers drop constraint if exists provider_service_offers_specializations_check;
alter table public.provider_service_offers add constraint provider_service_offers_specializations_check
check (cardinality(specializations) between 1 and 2);

create table if not exists public.provider_completed_works (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  work_code text not null check (work_code ~ '^TR[0-9]{2}$'),
  service_label text not null check (char_length(service_label) between 2 and 120),
  description text not null check (char_length(description) between 10 and 300),
  position smallint not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, work_code),
  unique(provider_id, position)
);

alter table public.provider_completed_works enable row level security;

create policy "trabajos realizados publicados" on public.provider_completed_works for select
using(provider_id = auth.uid() or public.has_role('admin') or exists (
  select 1 from public.provider_profiles pp where pp.user_id = provider_id and pp.published
));

create policy "prestador administra trabajos realizados" on public.provider_completed_works for all to authenticated
using(provider_id = auth.uid() or public.has_role('admin'))
with check(provider_id = auth.uid() or public.has_role('admin'));

alter table public.provider_portfolio_items
  add column if not exists work_id uuid references public.provider_completed_works(id) on delete cascade,
  add column if not exists photo_position smallint check (photo_position between 1 and 3),
  add column if not exists image_width integer not null default 900 check (image_width = 900),
  add column if not exists image_height integer not null default 900 check (image_height = 900),
  add column if not exists watermarked boolean not null default false,
  add column if not exists drive_folder_path text,
  add column if not exists drive_file_id text,
  add column if not exists drive_sync_status text not null default 'pending' check (drive_sync_status in ('pending', 'processing', 'synced', 'failed'));

create unique index if not exists provider_portfolio_work_photo_unique
on public.provider_portfolio_items(work_id, photo_position)
where work_id is not null;

create table if not exists public.drive_media_outbox (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  completed_work_id uuid not null references public.provider_completed_works(id) on delete cascade,
  source_storage_path text not null unique,
  target_root_folder_id text not null default '1YyLePscAWsVX8O9aIKaQTaMHSPpMq3ZD',
  target_relative_path text not null,
  target_file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'synced', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  drive_file_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drive_media_outbox enable row level security;

create policy "prestador registra copia en drive" on public.drive_media_outbox for insert to authenticated
with check(provider_id = auth.uid() or public.has_role('admin'));

create policy "prestador ve copia en drive" on public.drive_media_outbox for select to authenticated
using(provider_id = auth.uid() or public.has_role('admin'));

drop policy if exists "prestador actualiza portfolio" on storage.objects;
create policy "prestador actualiza portfolio" on storage.objects for update to authenticated
using(bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)
with check(bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "prestador elimina portfolio" on storage.objects;
create policy "prestador elimina portfolio" on storage.objects for delete to authenticated
using(bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.app_settings(key, value)
values('drive_portfolio', jsonb_build_object(
  'project_root_folder_id', '1Y8lNj4zpDXRA_ASUn0GCRmbtI9TE2QfI',
  'professionals_folder_id', '1YyLePscAWsVX8O9aIKaQTaMHSPpMq3ZD',
  'folder_pattern', 'ID_Nombre_Apellido/Trabajos/TRNN_Servicio'
))
on conflict(key) do update set value = excluded.value, updated_at = now();

create or replace function public.enqueue_sheet_mirror() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_tab text;
begin
  target_tab := case TG_TABLE_NAME
    when 'profiles' then 'Usuarios' when 'provider_profiles' then 'Profesionales' when 'provider_service_offers' then 'Profesionales'
    when 'provider_completed_works' then 'Trabajos' when 'service_requests' then 'Contactos' when 'quotes' then 'Presupuestos'
    when 'jobs' then 'Trabajos' when 'reviews' then 'Reseñas' when 'payments' then 'Pagos'
    when 'provider_availability' then 'Agenda' when 'audit_logs' then 'Auditoría' when 'provider_rate_items' then 'Tarifario'
    when 'provider_quote_templates' then 'Plantillas' when 'provider_memberships' then 'Membresías'
  end;
  insert into public.sheet_mirror_outbox(tab, entity_type, entity_id, operation, payload)
  values(target_tab, TG_TABLE_NAME, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', to_jsonb(new)->>'provider_id'), TG_OP, to_jsonb(new));
  return new;
end $$;

drop trigger if exists provider_completed_works_sheet_mirror on public.provider_completed_works;
create trigger provider_completed_works_sheet_mirror after insert or update on public.provider_completed_works
for each row execute function public.enqueue_sheet_mirror();
