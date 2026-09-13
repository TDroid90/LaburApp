create or replace function public.admin_platform_metrics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.has_role('admin'::public.app_role) then
    raise exception using message = 'ADMIN_REQUIRED';
  end if;

  with
  user_counts as (
    select
      count(*)::integer as total,
      count(*) filter (where account_status = 'active')::integer as active,
      count(*) filter (where created_at >= now() - interval '30 days')::integer as new_30d
    from public.profiles
  ),
  provider_counts as (
    select
      count(*)::integer as total,
      count(*) filter (where published)::integer as published
    from public.provider_profiles
  ),
  paid_memberships as (
    select client_id as user_id, 'client'::text as membership_type
    from public.client_memberships
    where plan_code <> 'free'
      and status in ('active', 'trialing')
      and (current_period_ends_at is null or current_period_ends_at > now())
    union all
    select provider_id as user_id, 'provider'::text as membership_type
    from public.provider_memberships
    where plan_code <> 'free'
      and status in ('active', 'trialing')
      and (current_period_ends_at is null or current_period_ends_at > now())
  ),
  membership_counts as (
    select
      count(distinct user_id)::integer as total,
      count(distinct user_id) filter (where membership_type = 'client')::integer as clients,
      count(distinct user_id) filter (where membership_type = 'provider')::integer as providers
    from paid_memberships
  ),
  request_counts as (
    select
      count(*)::integer as total,
      count(*) filter (where created_at >= now() - interval '30 days')::integer as last_30d,
      count(*) filter (where status = 'cancelled')::integer as cancelled
    from public.service_requests
  ),
  quote_counts as (
    select
      count(*)::integer as total,
      count(*) filter (where created_at >= now() - interval '30 days')::integer as last_30d
    from public.quotes
  ),
  job_counts as (
    select
      count(*)::integer as total,
      count(*) filter (where created_at >= now() - interval '30 days')::integer as last_30d,
      count(*) filter (where status in ('completed', 'funds_released'))::integer as completed
    from public.jobs
  ),
  review_counts as (
    select count(*)::integer as total, coalesce(round(avg(rating)::numeric, 1), 0) as average_rating
    from public.reviews
  ),
  verified_counts as (
    select count(distinct provider_id)::integer as providers
    from public.credentials
    where status = 'verified'
  )
  select jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total', u.total,
      'clients', greatest(u.total - p.total, 0),
      'providers', p.total,
      'active', u.active,
      'new_30d', u.new_30d,
      'published_providers', p.published,
      'verified_providers', v.providers
    ),
    'subscriptions', jsonb_build_object(
      'total', m.total,
      'clients', m.clients,
      'providers', m.providers
    ),
    'activity', jsonb_build_object(
      'requests', rq.total,
      'requests_30d', rq.last_30d,
      'cancelled_requests', rq.cancelled,
      'quotes', q.total,
      'quotes_30d', q.last_30d,
      'jobs', j.total,
      'jobs_30d', j.last_30d,
      'completed_jobs', j.completed
    ),
    'quality', jsonb_build_object(
      'reviews', rv.total,
      'average_rating', rv.average_rating
    ),
    'cities', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'city', city_data.city,
          'users', city_data.users,
          'providers', city_data.providers
        ) order by city_data.users desc, city_data.city
      )
      from (
        select
          pr.city,
          count(*)::integer as users,
          count(pp.user_id)::integer as providers
        from public.profiles pr
        left join public.provider_profiles pp on pp.user_id = pr.id
        group by pr.city
      ) city_data
    ), '[]'::jsonb)
  ) into result
  from user_counts u
  cross join provider_counts p
  cross join membership_counts m
  cross join request_counts rq
  cross join quote_counts q
  cross join job_counts j
  cross join review_counts rv
  cross join verified_counts v;

  return result;
end;
$$;

revoke all on function public.admin_platform_metrics() from public;
grant execute on function public.admin_platform_metrics() to authenticated;

