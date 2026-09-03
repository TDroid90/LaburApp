create table if not exists public.service_dictionary (
  id uuid primary key default gen_random_uuid(),
  trade_name text not null,
  code text not null unique,
  label text not null,
  default_unit text not null,
  suggested_price numeric(12,2) check (suggested_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_plans (
  code text primary key,
  name text not null,
  max_trades integer not null check (max_trades between 1 and 20),
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  active boolean not null default true
);

insert into public.membership_plans(code, name, max_trades, monthly_price) values
  ('free', 'Perfil profesional', 2, 0),
  ('multioficio', 'Multioficio', 10, 0)
on conflict(code) do update set name = excluded.name, max_trades = excluded.max_trades;

create table if not exists public.provider_memberships (
  provider_id uuid primary key references public.profiles(id) on delete cascade,
  plan_code text not null default 'free' references public.membership_plans(code),
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled')),
  current_period_ends_at timestamptz,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  trade_name text not null,
  position integer not null check (position between 1 and 20),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(provider_id, trade_name),
  unique(provider_id, position)
);

create table if not exists public.provider_rate_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  dictionary_item_id uuid references public.service_dictionary(id) on delete set null,
  trade_name text not null,
  label text not null,
  unit text not null default 'servicio',
  unit_price numeric(12,2) not null check (unit_price >= 0),
  pricing_mode text not null default 'itemized' check (pricing_mode in ('itemized','fixed','starting_at')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_quote_templates (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  trade_name text not null,
  name text not null,
  pricing_mode text not null default 'itemized' check (pricing_mode in ('itemized','fixed','starting_at')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  eta text,
  notes text,
  valid_days integer not null default 7 check (valid_days between 1 and 90),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.ensure_provider_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.provider_memberships(provider_id, plan_code, status)
  values(new.user_id, 'free', 'active')
  on conflict(provider_id) do nothing;
  return new;
end $$;

drop trigger if exists ensure_provider_membership on public.provider_profiles;
create trigger ensure_provider_membership after insert on public.provider_profiles for each row execute function public.ensure_provider_membership();

insert into public.provider_memberships(provider_id, plan_code, status)
select user_id, 'free', 'active' from public.provider_profiles
on conflict(provider_id) do nothing;

create or replace function public.enforce_provider_trade_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare allowed_trades integer;
declare current_trades integer;
begin
  select coalesce(mp.max_trades, 2) into allowed_trades
  from public.provider_memberships pm join public.membership_plans mp on mp.code = pm.plan_code
  where pm.provider_id = new.provider_id and pm.status in ('active','trialing');
  allowed_trades := coalesce(allowed_trades, 2);
  select count(*) into current_trades from public.provider_services where provider_id = new.provider_id and active and id <> new.id;
  if new.active and current_trades >= allowed_trades then raise exception 'El plan actual permite hasta % oficios', allowed_trades; end if;
  return new;
end $$;

drop trigger if exists provider_trade_limit on public.provider_services;
create trigger provider_trade_limit before insert or update on public.provider_services for each row execute function public.enforce_provider_trade_limit();

create or replace function public.notify_new_service_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(user_id, kind, title, body, data)
  values(new.provider_id, 'quote_request', 'Nueva solicitud de presupuesto', left(new.description, 600), jsonb_build_object('request_id', new.id, 'action', 'respond_quote'));
  return new;
end $$;

drop trigger if exists notify_provider_new_request on public.service_requests;
create trigger notify_provider_new_request after insert on public.service_requests for each row execute function public.notify_new_service_request();

alter table public.service_dictionary enable row level security;
alter table public.membership_plans enable row level security;
alter table public.provider_memberships enable row level security;
alter table public.provider_services enable row level security;
alter table public.provider_rate_items enable row level security;
alter table public.provider_quote_templates enable row level security;

create policy "diccionario publico" on public.service_dictionary for select using(active);
create policy "planes publicos" on public.membership_plans for select using(active);
create policy "membresia propia" on public.provider_memberships for select to authenticated using(provider_id = auth.uid() or public.has_role('admin'));
create policy "admin administra membresias" on public.provider_memberships for all to authenticated using(public.has_role('admin')) with check(public.has_role('admin'));
create policy "oficios publicados" on public.provider_services for select using(active or provider_id = auth.uid() or public.has_role('admin'));
create policy "prestador administra oficios" on public.provider_services for all to authenticated using(provider_id = auth.uid() or public.has_role('admin')) with check(provider_id = auth.uid() or public.has_role('admin'));
create policy "tarifario propio" on public.provider_rate_items for select to authenticated using(provider_id = auth.uid() or public.has_role('admin'));
create policy "prestador administra tarifario" on public.provider_rate_items for all to authenticated using(provider_id = auth.uid() or public.has_role('admin')) with check(provider_id = auth.uid() or public.has_role('admin'));
create policy "plantillas privadas" on public.provider_quote_templates for all to authenticated using(provider_id = auth.uid() or public.has_role('admin')) with check(provider_id = auth.uid() or public.has_role('admin'));

insert into public.service_dictionary(trade_name, code, label, default_unit, suggested_price) values
  ('Gasista','gas-visita','Visita y diagnóstico','visita',35000),
  ('Gasista','gas-mano-obra','Mano de obra básica','servicio',25000),
  ('Plomería','plom-visita','Visita y diagnóstico','visita',30000),
  ('Plomería','plom-perdida','Reparación de pérdida simple','servicio',38000),
  ('Electricidad','elec-visita','Revisión de instalación','visita',30000),
  ('Electricidad','elec-boca','Instalación de boca','unidad',28000),
  ('Limpieza','limp-hora','Hora de limpieza','hora',12000),
  ('Limpieza','limp-profunda','Limpieza profunda','ambiente',24000),
  ('Cuidadora de adultos mayores','cuida-hora','Hora de acompañamiento','hora',12000),
  ('Cuidadora de adultos mayores','cuida-noche','Guardia nocturna','noche',95000),
  ('Ayudante de obra','obra-jornal','Jornal','jornada',55000),
  ('Repartidor','reparto-viaje','Entrega dentro de la ciudad','viaje',9000),
  ('Carga y descarga','carga-hora','Operario de carga','hora',15000),
  ('Pintura','pint-m2','Pintura interior','m²',6500),
  ('Jardinería','jardin-hora','Mantenimiento general','hora',15000),
  ('Fletes y mudanzas','flete-base','Flete base','viaje',60000),
  ('Mecánica','mec-diagnostico','Diagnóstico','revisión',40000),
  ('Informática y soporte técnico','info-hora','Soporte técnico','hora',22000),
  ('Carpintería','carp-armado','Armado de mueble','unidad',45000),
  ('Herrería','herr-soldadura','Trabajo de soldadura','hora',26000)
on conflict(code) do update set label = excluded.label, default_unit = excluded.default_unit, suggested_price = excluded.suggested_price;

alter table public.sheet_mirror_outbox drop constraint if exists sheet_mirror_outbox_tab_check;
alter table public.sheet_mirror_outbox add constraint sheet_mirror_outbox_tab_check check (tab in ('Usuarios','Profesionales','Contactos','Presupuestos','Trabajos','Reseñas','Pagos','Agenda','Auditoría','Tarifario','Plantillas','Membresías'));

create or replace function public.enqueue_sheet_mirror() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_tab text;
begin
  target_tab := case TG_TABLE_NAME
    when 'profiles' then 'Usuarios' when 'provider_profiles' then 'Profesionales' when 'service_requests' then 'Contactos'
    when 'quotes' then 'Presupuestos' when 'jobs' then 'Trabajos' when 'reviews' then 'Reseñas' when 'payments' then 'Pagos'
    when 'provider_availability' then 'Agenda' when 'audit_logs' then 'Auditoría' when 'provider_rate_items' then 'Tarifario'
    when 'provider_quote_templates' then 'Plantillas' when 'provider_memberships' then 'Membresías'
  end;
  insert into public.sheet_mirror_outbox(tab, entity_type, entity_id, operation, payload)
  values(target_tab, TG_TABLE_NAME, coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', to_jsonb(new)->>'provider_id'), TG_OP, to_jsonb(new));
  return new;
end $$;

create trigger rate_items_sheet_mirror after insert or update on public.provider_rate_items for each row execute function public.enqueue_sheet_mirror();
create trigger quote_templates_sheet_mirror after insert or update on public.provider_quote_templates for each row execute function public.enqueue_sheet_mirror();
create trigger memberships_sheet_mirror after insert or update on public.provider_memberships for each row execute function public.enqueue_sheet_mirror();
