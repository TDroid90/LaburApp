alter table public.client_memberships
  add column if not exists active_plan_months smallint not null default 0
  check (active_plan_months in (0, 1, 3, 6, 12));

update public.client_memberships cm
set active_plan_months = case
  when cm.plan_code = 'plus' and cm.status = 'active'
    and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
  then coalesce((
    select sr.plan_months
    from public.subscription_requests sr
    where sr.client_id = cm.client_id and sr.status = 'approved'
    order by sr.approved_at desc nulls last, sr.created_at desc
    limit 1
  ), 1)
  else 0
end;

create or replace function public.admin_set_premium_by_public_id(target_public_id text, enable_premium boolean)
returns table(client_id uuid, plan_code text, period_ends_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
declare pending_request public.subscription_requests;
declare next_end timestamptz;
declare selected_months integer;
begin
  if not public.has_role('admin') then raise exception using message = 'ADMIN_REQUIRED'; end if;
  select id into target_id from public.profiles where public_id = trim(target_public_id);
  if target_id is null then raise exception using message = 'ACCOUNT_NOT_FOUND'; end if;
  if enable_premium then
    select * into pending_request from public.subscription_requests
    where subscription_requests.client_id = target_id and status = 'pending'
    order by created_at desc limit 1 for update;
    selected_months := coalesce(pending_request.plan_months, 1);
    next_end := greatest(now(), coalesce((select cm.current_period_ends_at from public.client_memberships cm where cm.client_id = target_id), now()))
      + make_interval(months => selected_months);
    insert into public.client_memberships(client_id, plan_code, status, current_period_ends_at, active_plan_months)
    values(target_id, 'plus', 'active', next_end, selected_months)
    on conflict on constraint client_memberships_pkey do update
      set plan_code = 'plus', status = 'active', current_period_ends_at = next_end,
          active_plan_months = selected_months, updated_at = now();
    if pending_request.id is not null then
      update public.subscription_requests set status = 'approved', approved_at = now(), approved_by = auth.uid()
      where id = pending_request.id;
    end if;
  else
    update public.client_memberships
    set plan_code = 'free', status = 'cancelled', current_period_ends_at = now(), active_plan_months = 0, updated_at = now()
    where client_memberships.client_id = target_id;
  end if;
  insert into public.audit_logs(actor_id, action, target_type, target_id, reason)
  values(auth.uid(), case when enable_premium then 'premium_enabled' else 'premium_disabled' end,
    'client_membership', target_id::text, case when pending_request.id is not null then pending_request.id::text else 'manual' end);
  return query select cm.client_id, cm.plan_code, cm.current_period_ends_at
    from public.client_memberships cm where cm.client_id = target_id;
end $$;

revoke all on function public.admin_set_premium_by_public_id(text, boolean) from public;
grant execute on function public.admin_set_premium_by_public_id(text, boolean) to authenticated;

create or replace function public.discover_published_providers()
returns table (
  provider_id uuid,
  public_id text,
  display_name text,
  city text,
  avatar_path text,
  trade_title text,
  skills_text text,
  bio text,
  certifications text[],
  diagnostic_price numeric,
  availability_start time,
  availability_end time,
  completed_jobs integer,
  rating numeric,
  verified boolean,
  works jsonb,
  subscription_priority integer,
  registered_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pp.user_id,
    p.public_id,
    p.full_name,
    p.city,
    p.avatar_path,
    pp.trade_title,
    pp.skills_text,
    pp.bio,
    pp.certifications,
    pp.diagnostic_price,
    pp.availability_start,
    pp.availability_end,
    pp.completed_jobs,
    pp.rating,
    pp.verified_at is not null,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cw.id,
          'title', cw.service_label,
          'description', cw.description,
          'photos', coalesce((
            select jsonb_agg(pi.storage_path order by pi.photo_position)
            from public.provider_portfolio_items pi
            where pi.work_id = cw.id and pi.provider_id = pp.user_id
          ), '[]'::jsonb)
        ) order by cw.position
      )
      from public.provider_completed_works cw
      where cw.provider_id = pp.user_id
    ), '[]'::jsonb),
    case
      when cm.plan_code = 'plus' and cm.status = 'active'
        and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
      then cm.active_plan_months
      else 0
    end::integer,
    pp.created_at
  from public.provider_profiles pp
  join public.profiles p on p.id = pp.user_id
  left join public.client_memberships cm on cm.client_id = pp.user_id
  where pp.published = true and p.account_status = 'active'
  order by 17 desc, pp.completed_jobs desc, pp.rating desc nulls last, pp.created_at desc;
$$;

revoke all on function public.discover_published_providers() from public;
grant execute on function public.discover_published_providers() to anon, authenticated;
