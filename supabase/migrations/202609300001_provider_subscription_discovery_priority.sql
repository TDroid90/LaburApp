-- Public discovery exposes only a coarse duration priority. Payment amounts,
-- receipts and membership dates remain private.
drop function if exists public.discover_published_providers();

create function public.discover_published_providers()
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
      when cm.plan_code = 'plus'
        and cm.status = 'active'
        and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
      then coalesce((
        select sr.plan_months
        from public.subscription_requests sr
        where sr.client_id = pp.user_id and sr.status = 'approved'
        order by sr.approved_at desc nulls last, sr.created_at desc
        limit 1
      ), 1)
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
