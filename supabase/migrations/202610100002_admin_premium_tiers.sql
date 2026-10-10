-- Permite que administración active una capa Premium concreta sin exponer
-- fechas internas en la interfaz. La fecha de habilitación queda auditada.
alter table public.client_memberships
  add column if not exists activated_at timestamptz;

create or replace function public.admin_set_premium_by_public_id_for_months(
  target_public_id text,
  enable_premium boolean,
  selected_plan_months smallint
)
returns table(client_id uuid, plan_code text, period_ends_at timestamptz, active_plan_months smallint)
language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  pending_request public.subscription_requests;
  next_end timestamptz;
  selected_months smallint;
begin
  if not public.has_role('admin') then
    raise exception using message = 'ADMIN_REQUIRED';
  end if;

  select id into target_id
  from public.profiles
  where public_id = trim(target_public_id);
  if target_id is null then
    raise exception using message = 'ACCOUNT_NOT_FOUND';
  end if;

  if enable_premium then
    if selected_plan_months not in (1, 3, 6, 12) then
      raise exception using message = 'INVALID_PREMIUM_TIER';
    end if;
    selected_months := selected_plan_months;

    select * into pending_request
    from public.subscription_requests
    where subscription_requests.client_id = target_id and status = 'pending'
    order by created_at desc
    limit 1
    for update;

    next_end := greatest(
      now(),
      coalesce((select cm.current_period_ends_at from public.client_memberships cm where cm.client_id = target_id), now())
    ) + make_interval(months => selected_months);

    insert into public.client_memberships(
      client_id, plan_code, status, current_period_ends_at, active_plan_months, activated_at
    ) values(target_id, 'plus', 'active', next_end, selected_months, now())
    on conflict on constraint client_memberships_pkey do update
      set plan_code = 'plus',
          status = 'active',
          current_period_ends_at = next_end,
          active_plan_months = selected_months,
          activated_at = now(),
          updated_at = now();

    if pending_request.id is not null then
      update public.subscription_requests
      set status = 'approved', approved_at = now(), approved_by = auth.uid()
      where id = pending_request.id;
    end if;
  else
    update public.client_memberships
    set plan_code = 'free', status = 'cancelled', current_period_ends_at = now(),
        active_plan_months = 0, updated_at = now()
    where client_memberships.client_id = target_id;
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, reason)
  values(
    auth.uid(),
    case when enable_premium then 'premium_enabled' else 'premium_disabled' end,
    'client_membership',
    target_id::text,
    case when enable_premium then 'manual_tier_' || selected_months::text || '_months'
         else 'manual' end
  );

  return query
  select cm.client_id, cm.plan_code, cm.current_period_ends_at, cm.active_plan_months
  from public.client_memberships cm
  where cm.client_id = target_id;
end $$;

revoke all on function public.admin_set_premium_by_public_id_for_months(text, boolean, smallint) from public;
grant execute on function public.admin_set_premium_by_public_id_for_months(text, boolean, smallint) to authenticated;
