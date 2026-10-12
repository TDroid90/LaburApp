-- Matriz de beneficios de la tabla de planes: 0=Gratis, 1/3/6/12=Premium.
create or replace function public.account_plan_limit(target_user_id uuid, benefit text)
returns integer
language plpgsql stable security definer set search_path = '' as $$
declare months smallint := 0;
begin
  select case
    when cm.plan_code = 'plus' and cm.status = 'active'
      and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
    then cm.active_plan_months else 0 end
  into months
  from public.client_memberships cm where cm.client_id = target_user_id;
  months := coalesce(months, 0);

  if benefit in ('services', 'works') then
    return case months when 1 then 3 when 3 then 5 when 6 then 8 when 12 then 10 else 2 end;
  elsif benefit = 'weekly_requests' then
    return case months when 3 then 5 when 6 then 10 when 12 then 20 else 3 end;
  elsif benefit = 'review_aspects' then
    return case months when 1 then 3 when 3 then 3 when 6 then 5 when 12 then 7 else 2 end;
  end if;
  raise exception using message = 'UNKNOWN_PLAN_BENEFIT';
end $$;

revoke all on function public.account_plan_limit(uuid, text) from public;
grant execute on function public.account_plan_limit(uuid, text) to anon, authenticated, service_role;

alter table public.provider_service_offers
  drop constraint if exists provider_service_offers_position_check;
alter table public.provider_service_offers
  add constraint provider_service_offers_position_check check (position between 1 and 10);
alter table public.provider_completed_works
  drop constraint if exists provider_completed_works_position_check;
alter table public.provider_completed_works
  add constraint provider_completed_works_position_check check (position between 1 and 10);

create or replace function public.enforce_provider_offer_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare allowed_count integer := public.account_plan_limit(new.provider_id, 'services');
declare current_count integer;
begin
  select count(*) into current_count from public.provider_service_offers item
  where item.provider_id = new.provider_id and item.active and item.id <> new.id;
  if new.active and (current_count >= allowed_count or new.position > allowed_count) then
    raise exception using message = 'SERVICE_LIMIT';
  end if;
  return new;
end $$;

create or replace function public.enforce_completed_work_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare allowed_count integer := public.account_plan_limit(new.provider_id, 'works');
declare current_count integer;
begin
  select count(*) into current_count from public.provider_completed_works item
  where item.provider_id = new.provider_id and item.id <> new.id;
  if current_count >= allowed_count or new.position > allowed_count then
    raise exception using message = 'PORTFOLIO_LIMIT';
  end if;
  return new;
end $$;

create or replace function public.enforce_client_weekly_request_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare allowed_requests integer := public.account_plan_limit(new.client_id, 'weekly_requests');
declare weekly_requests integer;
begin
  select count(*) into weekly_requests from public.service_requests sr
  where sr.client_id = new.client_id and sr.created_at >= date_trunc('week', now())
    and sr.status <> 'cancelled';
  if weekly_requests >= allowed_requests then
    raise exception using message = 'PLAN_WEEKLY_REQUEST_LIMIT';
  end if;
  new.expires_at := least(coalesce(new.expires_at, now() + interval '5 days'), now() + interval '5 days');
  return new;
end $$;

-- Preserve the complete existing RPC and replace only its known, outdated cap.
do $$
declare definition text;
declare old_limit constant text := 'v_service_limit := case when public.account_has_active_premium(v_user_id) then 6 else 2 end;';
begin
  definition := pg_get_functiondef('public.save_own_provider_profile(jsonb)'::regprocedure);
  if position(old_limit in definition) = 0 then
    raise exception 'save_own_provider_profile cambió: revisar antes de aplicar límites';
  end if;
  execute replace(definition, old_limit,
    'v_service_limit := public.account_plan_limit(v_user_id, ''services'');');
end $$;

drop policy if exists "cliente crea resena verificada" on public.reviews;
create policy "cliente crea resena verificada" on public.reviews
for insert to authenticated with check (
  reviews.client_id = auth.uid()
  and cardinality(reviews.qualities) <= public.account_plan_limit(auth.uid(), 'review_aspects')
  and exists (
    select 1 from public.jobs j
    where j.id = reviews.job_id and j.client_id = auth.uid()
      and j.provider_id = reviews.provider_id
      and j.completion_verified_at is not null
      and j.status in ('completed', 'funds_released')
  )
);

drop policy if exists "cliente edita resena cinco minutos" on public.reviews;
create policy "cliente edita resena cinco minutos" on public.reviews
for update to authenticated
using (client_id = auth.uid() and created_at > now() - interval '5 minutes' and moderated_at is null)
with check (
  client_id = auth.uid() and created_at > now() - interval '5 minutes'
  and cardinality(qualities) <= public.account_plan_limit(auth.uid(), 'review_aspects')
);

-- Owners/admins can still manage existing entries after a downgrade; others see only the plan's slots.
drop policy if exists "servicios publicados" on public.provider_service_offers;
create policy "servicios publicados" on public.provider_service_offers for select
using (provider_id = auth.uid() or public.has_role('admin')
  or (active and position <= public.account_plan_limit(provider_id, 'services')));

drop policy if exists "trabajos realizados publicados" on public.provider_completed_works;
create policy "trabajos realizados publicados" on public.provider_completed_works for select
using (provider_id = auth.uid() or public.has_role('admin') or (
  position <= public.account_plan_limit(provider_id, 'works')
  and exists (select 1 from public.provider_profiles pp
    where pp.user_id = provider_completed_works.provider_id and pp.published)
));

-- The public directory is SECURITY DEFINER, so its work projection needs the same cap explicitly.
do $$
declare definition text;
declare old_filter constant text := 'where cw.provider_id = pp.user_id';
begin
  definition := pg_get_functiondef('public.discover_published_providers()'::regprocedure);
  if position(old_filter in definition) = 0 then
    raise exception 'discover_published_providers cambió: revisar antes de aplicar límites';
  end if;
  execute replace(definition, old_filter,
    'where cw.provider_id = pp.user_id and cw.position <= public.account_plan_limit(pp.user_id, ''works'')');
end $$;
