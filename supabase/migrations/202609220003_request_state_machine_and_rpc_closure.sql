-- Global retention is maintenance work. Normal clients must never invoke it.
revoke all on function public.purge_expired_client_data() from public;
revoke execute on function public.purge_expired_client_data() from anon, authenticated;
grant execute on function public.purge_expired_client_data() to service_role;

-- A client may only create the initial state used by the current application,
-- and only against an active, published provider.
drop policy if exists "cliente crea solicitud" on public.service_requests;
create policy "cliente crea solicitud"
on public.service_requests for insert to authenticated
with check (
  client_id = auth.uid()
  and provider_id <> auth.uid()
  and status = 'request_sent'
  and accepted_at is null
  and completion_verified_at is null
  and cancelled_by is null
  and cancelled_by_role is null
  and cancellation_reason is null
  and cancelled_at is null
  and previous_status is null
  and exists (
    select 1
    from public.provider_profiles pp
    join public.profiles p on p.id = pp.user_id
    where pp.user_id = provider_id
      and pp.published = true
      and p.account_status = 'active'
  )
);

create or replace function public.enforce_service_request_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_admin boolean := auth.role() = 'service_role' or public.has_role('admin');
  transition_allowed boolean := false;
begin
  if actor_is_admin then
    return new;
  end if;

  if actor_id is null then
    raise exception using errcode = '42501', message = 'REQUEST_TRANSITION_FORBIDDEN';
  end if;

  if new.id is distinct from old.id
    or new.client_id is distinct from old.client_id
    or new.provider_id is distinct from old.provider_id
    or new.created_at is distinct from old.created_at
    or new.description is distinct from old.description
    or new.approximate_zone is distinct from old.approximate_zone
    or new.desired_at is distinct from old.desired_at
    or new.preferred_start_time is distinct from old.preferred_start_time
    or new.preferred_end_time is distinct from old.preferred_end_time then
    raise exception using errcode = '42501', message = 'REQUEST_FIELDS_IMMUTABLE';
  end if;

  if new.status = old.status then
    return new;
  end if;

  transition_allowed := case
    when old.status = 'request_created' and new.status = 'request_sent'
      then actor_id = old.client_id
    when old.status = 'request_sent' and new.status = 'provider_reviewing'
      then actor_id = old.provider_id
    when old.status in ('request_sent', 'provider_reviewing', 'quote_revision_requested') and new.status = 'quote_sent'
      then actor_id = old.provider_id
    when old.status = 'quote_sent' and new.status in ('quote_revision_requested', 'quote_accepted')
      then actor_id = old.client_id
    when old.status = 'quote_accepted' and new.status = 'client_confirmation_pending'
      then actor_id = old.provider_id
    when old.status = 'client_confirmation_pending' and new.status = 'completed'
      then actor_id in (old.client_id, old.provider_id)
    when old.status in ('request_created', 'request_sent', 'provider_reviewing', 'quote_sent', 'quote_revision_requested')
      and new.status = 'cancelled'
      then actor_id in (old.client_id, old.provider_id)
    when old.status = 'cancelled' and new.status = old.previous_status
      then actor_id = old.cancelled_by
        and old.previous_status is not null
        and old.cancelled_at >= now() - interval '10 seconds'
    else false
  end;

  if not transition_allowed then
    raise exception using errcode = '42501', message = 'INVALID_REQUEST_TRANSITION';
  end if;

  if new.status = 'quote_accepted' and new.accepted_at is null then
    raise exception using errcode = '42501', message = 'INVALID_ACCEPTANCE_STATE';
  end if;
  if new.status = 'completed' and new.completion_verified_at is null then
    raise exception using errcode = '42501', message = 'INVALID_COMPLETION_STATE';
  end if;
  if new.status = 'cancelled' and (
    new.previous_status is distinct from old.status
    or new.cancelled_by is distinct from actor_id
    or new.cancelled_by_role is distinct from case when actor_id = old.client_id then 'client' else 'provider' end
    or new.cancellation_reason is distinct from case when actor_id = old.client_id then 'client_cancelled' else 'provider_declined' end
    or new.cancelled_at is null
  ) then
    raise exception using errcode = '42501', message = 'INVALID_CANCELLATION_STATE';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_service_request_transition on public.service_requests;
create trigger enforce_service_request_transition
before update on public.service_requests
for each row execute function public.enforce_service_request_transition();

