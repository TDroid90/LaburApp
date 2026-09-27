-- The INSERT policy must be able to verify provider eligibility without exposing
-- the private profiles row to the requesting client.
create or replace function public.is_active_published_provider(target_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_profiles pp
    join public.profiles p on p.id = pp.user_id
    where pp.user_id = target_provider_id
      and pp.published = true
      and p.account_status = 'active'
  );
$$;

revoke all on function public.is_active_published_provider(uuid) from public;
grant execute on function public.is_active_published_provider(uuid) to authenticated;

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
  and public.is_active_published_provider(provider_id)
);
