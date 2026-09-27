-- PostgreSQL concede EXECUTE sobre funciones nuevas a PUBLIC por defecto.
-- Los RPC que usa LaburApp ya tienen GRANT explícito para anon/authenticated.
revoke execute on all functions in schema public from public;

-- Mantiene fail-closed también para funciones que se creen en migraciones futuras.
alter default privileges in schema public revoke execute on functions from public;

-- La policy de perfil propio autoriza la fila completa. Estos campos pertenecen
-- al control de plataforma y no deben poder modificarse con un UPDATE directo.
create or replace function public.protect_profile_control_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and not public.has_role('admin') then
    new.public_id := old.public_id;
    new.account_status := old.account_status;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_control_fields on public.profiles;
create trigger protect_profile_control_fields
before update on public.profiles
for each row execute function public.protect_profile_control_fields();

-- El prestador asignado puede avanzar la solicitud, pero nunca cambiar sus
-- participantes ni reescribir la identidad temporal del registro.
create or replace function public.protect_service_request_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and not public.has_role('admin') then
    new.id := old.id;
    new.client_id := old.client_id;
    new.provider_id := old.provider_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_service_request_ownership on public.service_requests;
create trigger protect_service_request_ownership
before update on public.service_requests
for each row execute function public.protect_service_request_ownership();
