alter table public.service_requests
  add column if not exists cancelled_by uuid references public.profiles(id),
  add column if not exists cancelled_by_role text check (cancelled_by_role in ('client', 'provider')),
  add column if not exists cancellation_reason text check (cancellation_reason in ('client_cancelled', 'provider_declined')),
  add column if not exists cancelled_at timestamptz,
  add column if not exists previous_status public.job_status;

create index if not exists service_requests_cancelled_at_idx
on public.service_requests(cancelled_at)
where status = 'cancelled';

-- Una cuenta prestadora conserva siempre las capacidades de cliente.
insert into public.user_roles(user_id, role)
select user_id, 'client'::public.app_role
from public.user_roles
where role = 'provider'
on conflict do nothing;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare requested_role public.app_role;
declare requested_city text;
begin
  requested_role := case when new.raw_user_meta_data->>'role' = 'provider' then 'provider'::public.app_role else 'client'::public.app_role end;
  requested_city := case when new.raw_user_meta_data->>'city' in ('San Sebastián','Río Grande','Tolhuin','Almanza','Ushuaia') then new.raw_user_meta_data->>'city' else null end;
  insert into public.profiles(id, full_name, city)
  values(new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''), split_part(new.email,'@',1)), requested_city)
  on conflict(id) do nothing;
  insert into public.user_roles(user_id, role) values(new.id, 'client') on conflict do nothing;
  if requested_role = 'provider' then
    insert into public.user_roles(user_id, role) values(new.id, 'provider') on conflict do nothing;
  end if;
  return new;
end $$;

create or replace function public.enable_provider_mode() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using message = 'UNAUTHENTICATED'; end if;
  insert into public.user_roles(user_id, role) values(auth.uid(), 'client') on conflict do nothing;
  insert into public.user_roles(user_id, role) values(auth.uid(), 'provider') on conflict do nothing;
end $$;

drop policy if exists "prestador actualiza solicitud asignada" on public.service_requests;

create or replace function public.mark_service_request_quote_sent(target_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.service_requests
  set status = 'quote_sent',
      expires_at = least(coalesce(expires_at, now() + interval '5 days'), now() + interval '5 days')
  where id = target_request_id
    and provider_id = auth.uid()
    and status in ('request_sent', 'provider_reviewing', 'quote_revision_requested');
  if not found then raise exception using message = 'REQUEST_NOT_QUOTABLE'; end if;
end $$;

drop function if exists public.cancel_service_request(uuid);

create or replace function public.cancel_service_request(
  target_request_id uuid,
  cancellation_kind text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare selected_request public.service_requests;
declare actor_role text;
declare effective_reason text;
begin
  select * into selected_request
  from public.service_requests
  where id = target_request_id
  for update;

  if not found then raise exception using message = 'REQUEST_NOT_FOUND'; end if;
  if selected_request.status not in ('request_created','request_sent','provider_reviewing','quote_sent','quote_revision_requested') then
    raise exception using message = 'REQUEST_NOT_CANCELLABLE';
  end if;

  actor_role := case
    when selected_request.client_id = auth.uid() then 'client'
    when selected_request.provider_id = auth.uid() then 'provider'
    else null
  end;
  if actor_role is null then raise exception using message = 'REQUEST_NOT_CANCELLABLE'; end if;

  effective_reason := case
    when actor_role = 'provider' then 'provider_declined'
    else 'client_cancelled'
  end;
  if cancellation_kind is not null and cancellation_kind <> effective_reason then
    raise exception using message = 'INVALID_CANCELLATION_KIND';
  end if;

  update public.service_requests
  set previous_status = selected_request.status,
      status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_by_role = actor_role,
      cancellation_reason = effective_reason,
      cancelled_at = now()
  where id = target_request_id;
end $$;

create or replace function public.undo_cancel_service_request(target_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.service_requests
  set status = previous_status,
      previous_status = null,
      cancelled_by = null,
      cancelled_by_role = null,
      cancellation_reason = null,
      cancelled_at = null
  where id = target_request_id
    and status = 'cancelled'
    and cancelled_by = auth.uid()
    and previous_status is not null
    and cancelled_at >= now() - interval '10 seconds';
  if not found then raise exception using message = 'UNDO_WINDOW_EXPIRED'; end if;
end $$;

revoke all on function public.enable_provider_mode() from public;
revoke all on function public.mark_service_request_quote_sent(uuid) from public;
revoke all on function public.cancel_service_request(uuid, text) from public;
revoke all on function public.undo_cancel_service_request(uuid) from public;
grant execute on function public.enable_provider_mode() to authenticated;
grant execute on function public.mark_service_request_quote_sent(uuid) to authenticated;
grant execute on function public.cancel_service_request(uuid, text) to authenticated;
grant execute on function public.undo_cancel_service_request(uuid) to authenticated;
