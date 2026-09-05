alter table public.provider_profiles
  add column if not exists diagnostic_price numeric(12,2) not null default 0 check (diagnostic_price >= 0);

create table if not exists public.provider_service_offers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  family text not null check (char_length(family) between 2 and 80),
  specialization text not null check (char_length(specialization) between 2 and 120),
  description text not null check (char_length(description) between 10 and 240),
  position smallint not null check (position between 1 and 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, position)
);

alter table public.provider_service_offers enable row level security;

create policy "servicios publicados" on public.provider_service_offers for select
using(active or provider_id = auth.uid() or public.has_role('admin'));

create policy "prestador administra servicios" on public.provider_service_offers for all to authenticated
using(provider_id = auth.uid() or public.has_role('admin'))
with check(provider_id = auth.uid() or public.has_role('admin'));

create or replace function public.enqueue_sheet_mirror() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_tab text;
begin
  target_tab := case TG_TABLE_NAME
    when 'profiles' then 'Usuarios' when 'provider_profiles' then 'Profesionales' when 'provider_service_offers' then 'Profesionales'
    when 'service_requests' then 'Contactos' when 'quotes' then 'Presupuestos' when 'jobs' then 'Trabajos'
    when 'reviews' then 'Reseñas' when 'payments' then 'Pagos' when 'provider_availability' then 'Agenda'
    when 'audit_logs' then 'Auditoría' when 'provider_rate_items' then 'Tarifario'
    when 'provider_quote_templates' then 'Plantillas' when 'provider_memberships' then 'Membresías'
  end;
  insert into public.sheet_mirror_outbox(tab, entity_type, entity_id, operation, payload)
  values(target_tab, TG_TABLE_NAME, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', to_jsonb(new)->>'provider_id'), TG_OP, to_jsonb(new));
  return new;
end $$;

drop trigger if exists provider_service_offers_sheet_mirror on public.provider_service_offers;
create trigger provider_service_offers_sheet_mirror after insert or update on public.provider_service_offers
for each row execute function public.enqueue_sheet_mirror();
