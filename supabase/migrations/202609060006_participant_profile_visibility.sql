drop policy if exists "participantes ven perfil basico" on public.profiles;
create policy "participantes ven perfil basico" on public.profiles
for select to authenticated using (
  exists (
    select 1 from public.service_requests request
    where (request.client_id = auth.uid() and request.provider_id = profiles.id)
       or (request.provider_id = auth.uid() and request.client_id = profiles.id)
  )
);
