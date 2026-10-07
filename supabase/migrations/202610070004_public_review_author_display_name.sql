-- Public reviews show only the reviewer display name, never their email or account ID.
-- The reviewer name is intentionally included in this public projection for transparency.
drop function if exists public.discover_published_reviews();

create function public.discover_published_reviews()
returns table (
  provider_public_id text,
  author_name text,
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
      provider.public_id as provider_public_id,
      coalesce(nullif(btrim(reviewer.full_name), ''), 'Cliente verificado') as author_name,
      review.rating,
      review.comment,
      review.qualities,
      review.created_at,
      row_number() over (partition by review.provider_id order by review.created_at desc) as position
    from public.reviews as review
    join public.provider_profiles as provider_profile on provider_profile.user_id = review.provider_id
    join public.profiles as provider on provider.id = review.provider_id
    join public.profiles as reviewer on reviewer.id = review.client_id
    where review.moderated_at is null
      and provider_profile.published = true
      and provider.account_status = 'active'
  )
  select provider_public_id, author_name, rating, comment, qualities, created_at
  from ranked
  where position <= 3
  order by provider_public_id, created_at desc;
$$;

revoke all on function public.discover_published_reviews() from public;
grant execute on function public.discover_published_reviews() to anon, authenticated;
