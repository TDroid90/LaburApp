-- Prevent bypassing plan visibility by assigning a sparse, out-of-tier position.
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
