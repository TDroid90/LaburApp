alter table public.service_requests
  add column if not exists preferred_start_time time,
  add column if not exists preferred_end_time time;

alter table public.service_requests
  drop constraint if exists service_requests_preferred_time_check;

alter table public.service_requests
  add constraint service_requests_preferred_time_check check (
    preferred_start_time is null
    or preferred_end_time is null
    or preferred_end_time > preferred_start_time
  );

drop policy if exists "prestador actualiza solicitud asignada" on public.service_requests;
create policy "prestador actualiza solicitud asignada"
on public.service_requests for update to authenticated
using (provider_id = auth.uid() or public.has_role('admin'))
with check (provider_id = auth.uid() or public.has_role('admin'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare requested_role public.app_role;
declare requested_city text;
begin
  requested_role := case when new.raw_user_meta_data->>'role' = 'provider' then 'provider'::public.app_role else 'client'::public.app_role end;
  requested_city := case when new.raw_user_meta_data->>'city' in ('San Sebastián','Río Grande','Tolhuin','Almanza','Ushuaia') then new.raw_user_meta_data->>'city' else null end;
  insert into public.profiles(id, full_name, city)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)), requested_city)
  on conflict(id) do nothing;
  insert into public.user_roles(user_id, role) values(new.id, requested_role) on conflict do nothing;
  return new;
end $$;
