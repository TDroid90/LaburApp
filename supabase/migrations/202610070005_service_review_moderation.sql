-- The web admin is protected by Basic Auth and uses the server-only service role.
-- Let its review update pass the same identity guard as an in-app administrator.
create or replace function public.protect_review_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.has_role('admin') or (select auth.role()) = 'service_role' then return new; end if;
  if new.id is distinct from old.id or new.job_id is distinct from old.job_id
    or new.client_id is distinct from old.client_id or new.provider_id is distinct from old.provider_id
    or new.created_at is distinct from old.created_at or new.moderated_at is distinct from old.moderated_at then
    raise exception using message = 'REVIEW_IDENTITY_IMMUTABLE';
  end if;
  return new;
end $$;
