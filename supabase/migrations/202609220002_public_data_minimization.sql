-- Public profile data must be exposed through narrow RPC projections. RLS is
-- row-level and cannot hide account_status, must_change_password or timestamps.
drop policy if exists "identidad prestador publicada" on public.profiles;
drop policy if exists "participantes ven perfil basico" on public.profiles;

create or replace function public.get_visible_profile_summaries(target_ids uuid[] default null)
returns table (
  id uuid,
  public_id text,
  full_name text,
  city text,
  avatar_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.public_id, p.full_name, p.city, p.avatar_path
  from public.profiles p
  where auth.uid() is not null
    and (target_ids is null or p.id = any(target_ids))
    and (
      p.id = auth.uid()
      or public.has_role('admin')
      or exists (
        select 1
        from public.provider_profiles pp
        where pp.user_id = p.id and pp.published = true
      )
      or exists (
        select 1
        from public.service_requests sr
        where (sr.client_id = auth.uid() and sr.provider_id = p.id)
           or (sr.provider_id = auth.uid() and sr.client_id = p.id)
      )
    );
$$;

revoke all on function public.get_visible_profile_summaries(uuid[]) from public;
grant execute on function public.get_visible_profile_summaries(uuid[]) to authenticated;

-- Raw review rows remain visible only to their participants and moderation.
-- Public reputation uses a projection without review/job/client/provider UUIDs.
drop policy if exists "resenas publicas" on public.reviews;
drop policy if exists "participantes ven sus resenas" on public.reviews;
create policy "participantes ven sus resenas"
on public.reviews for select to authenticated
using (
  client_id = auth.uid()
  or provider_id = auth.uid()
  or public.has_role('moderator')
  or public.has_role('admin')
);

create or replace function public.discover_published_reviews()
returns table (
  provider_public_id text,
  rating integer,
  comment text,
  qualities text[],
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      p.public_id as provider_public_id,
      r.rating,
      r.comment,
      r.qualities,
      r.created_at,
      row_number() over (partition by r.provider_id order by r.created_at desc) as position
    from public.reviews r
    join public.provider_profiles pp on pp.user_id = r.provider_id
    join public.profiles p on p.id = r.provider_id
    where r.moderated_at is null
      and pp.published = true
      and p.account_status = 'active'
  )
  select provider_public_id, rating, comment, qualities, created_at
  from ranked
  where position <= 3
  order by provider_public_id, created_at desc;
$$;

revoke all on function public.discover_published_reviews() from public;
grant execute on function public.discover_published_reviews() to anon, authenticated;
