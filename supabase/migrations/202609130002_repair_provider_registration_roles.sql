-- Repara cuentas que eligieron ofrecer servicios pero quedaron únicamente con rol cliente.
insert into public.user_roles(user_id, role)
select id, 'provider'::public.app_role
from auth.users
where raw_user_meta_data->>'role' = 'provider'
on conflict do nothing;

insert into public.user_roles(user_id, role)
select id, 'client'::public.app_role
from auth.users
on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.app_role;
  requested_city text;
begin
  requested_role := case
    when new.raw_user_meta_data->>'role' = 'provider' then 'provider'::public.app_role
    else 'client'::public.app_role
  end;
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
  insert into public.user_roles(user_id, role) values(new.id, 'client') on conflict do nothing;
  if requested_role = 'provider' then
    insert into public.user_roles(user_id, role) values(new.id, 'provider') on conflict do nothing;
  end if;
  return new;
end;
$$;

