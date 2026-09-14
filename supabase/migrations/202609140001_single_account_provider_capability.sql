-- Toda cuenta nace como cliente. La capacidad de prestar servicios se obtiene
-- únicamente al completar y publicar provider_profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_city text;
begin
  requested_city := case
    when new.raw_user_meta_data->>'city' in ('San Sebastián', 'Río Grande', 'Tolhuin', 'Almanza', 'Ushuaia')
      then new.raw_user_meta_data->>'city'
    else null
  end;

  insert into public.profiles(id, full_name, city)
  values(
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    requested_city
  )
  on conflict(id) do nothing;

  insert into public.user_roles(user_id, role)
  values(new.id, 'client'::public.app_role)
  on conflict do nothing;
  return new;
end;
$$;

-- Normaliza altas anteriores que marcaron "provider" pero nunca publicaron
-- el perfil ampliado. La cuenta y todos sus datos personales se conservan.
delete from public.user_roles ur
where ur.role = 'provider'::public.app_role
  and not exists (
    select 1 from public.provider_profiles pp where pp.user_id = ur.user_id
  );

-- Garantiza que también los prestadores mantengan la capacidad común de cliente.
insert into public.user_roles(user_id, role)
select p.id, 'client'::public.app_role
from public.profiles p
on conflict do nothing;

