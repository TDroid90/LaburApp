create table if not exists public.professional_trades (
  name text primary key check (char_length(name) between 2 and 80),
  position smallint not null unique check (position between 1 and 200),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.professional_trades(name, position) values
  ('Gasista', 1), ('Electricista', 2), ('Plomero', 3), ('Técnico en calefacción', 4),
  ('Técnico en refrigeración', 5), ('Albañil', 6), ('Instalador de aberturas', 7),
  ('Pintor', 8), ('Carpintero', 9), ('Herrero', 10),
  ('Técnico en reparación de electrodomésticos', 11), ('Técnico en informática', 12),
  ('Mecánico', 13), ('Fletero', 14), ('Personal de limpieza', 15), ('Jardinero', 16),
  ('Cerrajero', 17), ('Cuidador de adultos mayores', 18), ('Niñera', 19),
  ('Peluquero', 20), ('Costurero', 21), ('Fotógrafo', 22), ('Profesor particular', 23),
  ('Guía turístico/a y excursiones', 24), ('Guía de senderismo', 25),
  ('Organizador/a de experiencias turísticas', 26), ('Planificador/a de itinerarios', 27),
  ('Candy', 28), ('Especialista en candy bar', 29), ('Wedding planner', 30),
  ('Coordinador/a de eventos', 31)
on conflict(name) do update set position = excluded.position, active = true;

alter table public.professional_trades enable row level security;
create policy "oficios profesionales publicados" on public.professional_trades for select
using(active);

update public.provider_profiles
set trade_title = replace(trade_title, 'Electricista domiciliario', 'Electricista'),
    skills_text = replace(replace(coalesce(skills_text, ''), 'Electricidad domiciliaria', 'Electricidad'), 'Limpieza domiciliaria', 'Limpieza general')
where trade_title ilike '%Electricista domiciliario%'
   or skills_text ilike '%Electricidad domiciliaria%'
   or skills_text ilike '%Limpieza domiciliaria%';

update public.provider_services set trade_name = 'Electricista'
where lower(trade_name) in ('electricista domiciliario', 'electricista domiciliaria');
update public.provider_rate_items set trade_name = 'Electricista'
where lower(trade_name) in ('electricista domiciliario', 'electricista domiciliaria');
update public.provider_service_offers
set specialization = case
      when lower(specialization) = 'electricidad domiciliaria' then 'Electricidad'
      when lower(specialization) = 'limpieza domiciliaria' then 'Limpieza general'
      else specialization
    end,
    specializations = array(
      select case
        when lower(value) = 'electricidad domiciliaria' then 'Electricidad'
        when lower(value) = 'limpieza domiciliaria' then 'Limpieza general'
        else value
      end
      from unnest(specializations) value
    )
where specialization ilike '%domiciliari%'
   or exists(select 1 from unnest(specializations) value where value ilike '%domiciliari%');

create or replace function public.validate_provider_trade_name() returns trigger
language plpgsql security definer set search_path = '' as $$
declare canonical_name text;
begin
  if not exists(
    select 1 from public.professional_trades pt
    where pt.active and lower(pt.name) = lower(trim(new.trade_name))
  ) then raise exception using errcode = '22023', message = 'INVALID_TRADE'; end if;
  select pt.name into canonical_name from public.professional_trades pt
  where pt.active and lower(pt.name) = lower(trim(new.trade_name));
  new.trade_name := canonical_name;
  return new;
end $$;

drop trigger if exists validate_provider_trade_name on public.provider_services;
create trigger validate_provider_trade_name
before insert or update of trade_name on public.provider_services
for each row execute function public.validate_provider_trade_name();

create or replace function public.validate_provider_trade_title() returns trigger
language plpgsql security definer set search_path = '' as $$
declare candidate text;
declare canonical text[] := '{}';
begin
  if new.trade_title is null or trim(new.trade_title) = '' then return new; end if;
  foreach candidate in array string_to_array(new.trade_title, ' · ') loop
    if not exists(
      select 1 from public.professional_trades pt
      where pt.active and lower(pt.name) = lower(trim(candidate))
    ) then raise exception using errcode = '22023', message = 'INVALID_TRADE'; end if;
    canonical := canonical || (
      select pt.name from public.professional_trades pt
      where pt.active and lower(pt.name) = lower(trim(candidate)) limit 1
    );
  end loop;
  new.trade_title := array_to_string(canonical, ' · ');
  return new;
end $$;

drop trigger if exists validate_provider_trade_title on public.provider_profiles;
create trigger validate_provider_trade_title
before insert or update of trade_title on public.provider_profiles
for each row execute function public.validate_provider_trade_title();

revoke all on function public.validate_provider_trade_name() from public;
revoke all on function public.validate_provider_trade_title() from public;
