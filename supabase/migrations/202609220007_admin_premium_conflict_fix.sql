-- Avoid PL/pgSQL ambiguity between the table-return column `client_id` and the
-- membership conflict target by naming the primary-key constraint explicitly.
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
    on conflict on constraint client_memberships_pkey do update
      set plan_code = 'plus', status = 'active', current_period_ends_at = next_end, updated_at = now();
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

revoke all on function public.admin_set_premium_by_public_id(text, boolean) from public, anon;
grant execute on function public.admin_set_premium_by_public_id(text, boolean) to authenticated;
