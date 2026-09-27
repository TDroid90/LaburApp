-- Premium real: 7 solicitudes semanales, 6 servicios y 6 trabajos publicados.
alter table public.provider_service_offers
  drop constraint if exists provider_service_offers_position_check;
alter table public.provider_service_offers
  add constraint provider_service_offers_position_check check (position between 1 and 6);

alter table public.provider_completed_works
  drop constraint if exists provider_completed_works_position_check;
alter table public.provider_completed_works
  add constraint provider_completed_works_position_check check (position between 1 and 6);

create or replace function public.account_has_active_premium(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_memberships cm
    where cm.client_id = target_user_id
      and cm.plan_code = 'plus'
      and cm.status = 'active'
      and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
  );
$$;

create or replace function public.enforce_provider_offer_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare allowed_count integer := case when public.account_has_active_premium(new.provider_id) then 6 else 2 end;
declare current_count integer;
begin
  select count(*) into current_count
  from public.provider_service_offers item
  where item.provider_id = new.provider_id and item.active and item.id <> new.id;
  if new.active and current_count >= allowed_count then
    raise exception using message = 'SERVICE_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists provider_offer_limit on public.provider_service_offers;
create trigger provider_offer_limit
before insert or update on public.provider_service_offers
for each row execute function public.enforce_provider_offer_limit();

create or replace function public.enforce_completed_work_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare allowed_count integer := case when public.account_has_active_premium(new.provider_id) then 6 else 3 end;
declare current_count integer;
begin
  select count(*) into current_count
  from public.provider_completed_works item
  where item.provider_id = new.provider_id and item.id <> new.id;
  if current_count >= allowed_count then
    raise exception using message = 'PORTFOLIO_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists provider_completed_work_limit on public.provider_completed_works;
create trigger provider_completed_work_limit
before insert or update on public.provider_completed_works
for each row execute function public.enforce_completed_work_limit();

create or replace function public.enforce_client_weekly_request_limit()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare premium boolean := public.account_has_active_premium(new.client_id);
declare weekly_requests integer;
declare allowed_requests integer := case when premium then 7 else 3 end;
begin
  select count(*) into weekly_requests
  from public.service_requests sr
  where sr.client_id = new.client_id
    and sr.created_at >= date_trunc('week', now())
    and sr.status <> 'cancelled';
  if weekly_requests >= allowed_requests then
    raise exception using message = case when premium then 'PREMIUM_WEEKLY_REQUEST_LIMIT' else 'FREE_WEEKLY_REQUEST_LIMIT' end;
  end if;
  new.expires_at := least(coalesce(new.expires_at, now() + interval '5 days'), now() + interval '5 days');
  return new;
end;
$$;

create or replace function public.save_own_provider_profile(p_profile jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_city text := nullif(trim(p_profile->>'city'), '');
  v_full_name text := trim(coalesce(p_profile->>'display_name', ''));
  v_trade text := trim(coalesce(p_profile->>'trade', ''));
  v_secondary_trade text := nullif(trim(coalesce(p_profile->>'secondary_trade', '')), '');
  v_diagnostic_price numeric := greatest(coalesce((p_profile->>'diagnostic_price')::numeric, 0), 0);
  v_start time := coalesce(nullif(p_profile->>'availability_start', '')::time, '08:00'::time);
  v_end time := coalesce(nullif(p_profile->>'availability_end', '')::time, '18:00'::time);
  v_public_id text;
  v_item jsonb;
  v_position integer := 0;
  v_specializations text[];
  v_service_limit integer;
begin
  if v_user_id is null then raise exception using errcode = '28000', message = 'AUTH_REQUIRED'; end if;
  v_service_limit := case when public.account_has_active_premium(v_user_id) then 6 else 2 end;
  if char_length(v_full_name) not between 2 and 100 then raise exception using errcode = '22023', message = 'INVALID_DISPLAY_NAME'; end if;
  if v_city not in ('San Sebastián', 'Río Grande', 'Tolhuin', 'Almanza', 'Ushuaia') then raise exception using errcode = '22023', message = 'INVALID_CITY'; end if;
  if char_length(v_trade) not between 2 and 80 then raise exception using errcode = '22023', message = 'INVALID_TRADE'; end if;
  if v_start >= v_end then raise exception using errcode = '22023', message = 'INVALID_AVAILABILITY'; end if;
  if jsonb_typeof(coalesce(p_profile->'services', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_profile->'services', '[]'::jsonb)) > v_service_limit then
    raise exception using errcode = '22023', message = 'SERVICE_LIMIT';
  end if;

  insert into public.profiles(id, full_name, city, avatar_path)
  values(v_user_id, v_full_name, v_city, nullif(p_profile->>'avatar_path', ''))
  on conflict(id) do update set full_name = excluded.full_name, city = excluded.city,
    avatar_path = excluded.avatar_path, updated_at = now()
  returning public_id into v_public_id;

  insert into public.user_roles(user_id, role) values(v_user_id, 'provider'::public.app_role)
  on conflict(user_id, role) do nothing;

  insert into public.provider_profiles(user_id, trade_title, diagnostic_price, bio, skills_text, training,
    certifications, zones, availability, availability_start, availability_end, published)
  values(v_user_id, concat_ws(' · ', v_trade, v_secondary_trade), v_diagnostic_price,
    nullif(trim(coalesce(p_profile->>'bio', '')), ''), nullif(trim(coalesce(p_profile->>'skills', '')), ''),
    nullif(trim(coalesce(p_profile->>'training', '')), ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'certifications', '[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'zones', '[]'::jsonb))), array[v_city]),
    nullif(trim(coalesce(p_profile->>'availability', '')), ''), v_start, v_end, true)
  on conflict(user_id) do update set trade_title = excluded.trade_title, diagnostic_price = excluded.diagnostic_price,
    bio = excluded.bio, skills_text = excluded.skills_text, training = excluded.training,
    certifications = excluded.certifications, zones = excluded.zones, availability = excluded.availability,
    availability_start = excluded.availability_start, availability_end = excluded.availability_end, published = true;

  delete from public.provider_services where provider_id = v_user_id;
  insert into public.provider_services(provider_id, trade_name, position, active) values(v_user_id, v_trade, 1, true);
  if v_secondary_trade is not null and v_secondary_trade <> v_trade then
    insert into public.provider_services(provider_id, trade_name, position, active) values(v_user_id, v_secondary_trade, 2, true);
  end if;

  delete from public.provider_rate_items where provider_id = v_user_id;
  insert into public.provider_rate_items(provider_id, trade_name, label, unit, unit_price, pricing_mode,
    availability_start, availability_end, slot_position, active)
  values(v_user_id, v_trade, 'Diagnóstico / visita técnica', 'visita', v_diagnostic_price,
    'starting_at', v_start, v_end, 1, true);

  delete from public.provider_service_offers where provider_id = v_user_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_profile->'services', '[]'::jsonb)) loop
    v_position := v_position + 1;
    v_specializations := coalesce(array(select jsonb_array_elements_text(coalesce(v_item->'specializations', '[]'::jsonb))),
      array[trim(coalesce(v_item->>'service', v_trade))]);
    if cardinality(v_specializations) = 0 then v_specializations := array[trim(coalesce(v_item->>'service', v_trade))]; end if;
    v_specializations := v_specializations[1:2];
    insert into public.provider_service_offers(provider_id, family, specialization, specializations, description, position, active)
    values(v_user_id, left(trim(coalesce(v_item->>'family', v_trade)), 80), left(array_to_string(v_specializations, ' · '), 120),
      v_specializations, left(trim(coalesce(v_item->>'description', 'Servicio profesional publicado en LaburApp.')), 240), v_position, true);
  end loop;
  return v_public_id;
end;
$$;

revoke all on function public.account_has_active_premium(uuid) from public;
revoke all on function public.save_own_provider_profile(jsonb) from public;
grant execute on function public.save_own_provider_profile(jsonb) to authenticated;
