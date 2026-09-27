-- Public buckets stay public by product decision, but only the path owner may
-- create, replace or delete their objects.
drop policy if exists "usuario carga avatar" on storage.objects;
create policy "usuario carga avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and name = auth.uid()::text || '/perfil.jpg');
drop policy if exists "usuario actualiza avatar" on storage.objects;
create policy "usuario actualiza avatar" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and name = auth.uid()::text || '/perfil.jpg')
with check (bucket_id = 'avatars' and name = auth.uid()::text || '/perfil.jpg');
drop policy if exists "usuario elimina avatar" on storage.objects;
create policy "usuario elimina avatar" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and name = auth.uid()::text || '/perfil.jpg');

-- Provider and client Drive queues accept only rows linked to a real owned
-- record. Root IDs are allowlisted and path traversal is rejected.
alter table public.drive_media_outbox drop constraint if exists drive_media_outbox_root_check;
alter table public.drive_media_outbox add constraint drive_media_outbox_root_check
  check (target_root_folder_id = '1YyLePscAWsVX8O9aIKaQTaMHSPpMq3ZD') not valid;
alter table public.drive_media_outbox drop constraint if exists drive_media_outbox_paths_check;
alter table public.drive_media_outbox add constraint drive_media_outbox_paths_check check (
  source_storage_path like provider_id::text || '/%'
  and source_storage_path not like '%..%'
  and source_storage_path not like E'%\\%'
  and target_relative_path not like '%..%'
  and target_relative_path not like E'%\\%'
  and target_relative_path not like '/%'
  and target_relative_path not like '%//%'
  and target_file_name not like '%/%'
  and target_file_name not like E'%\\%'
) not valid;

drop policy if exists "prestador registra copia en drive" on public.drive_media_outbox;
create policy "prestador registra copia en drive" on public.drive_media_outbox for insert to authenticated
with check (
  provider_id = auth.uid()
  and target_root_folder_id = '1YyLePscAWsVX8O9aIKaQTaMHSPpMq3ZD'
  and source_storage_path like auth.uid()::text || '/%'
  and target_relative_path like (
    select p.public_id || E'\\_%/Trabajos/%'
    from public.profiles p where p.id = auth.uid()
  ) escape E'\\'
  and status = 'pending' and attempts = 0 and drive_file_id is null
  and exists (
    select 1 from public.provider_completed_works cw
    where cw.id = completed_work_id and cw.provider_id = auth.uid()
  )
  and exists (
    select 1 from public.provider_portfolio_items pi
    where pi.work_id = completed_work_id
      and pi.provider_id = auth.uid()
      and pi.storage_path = source_storage_path
  )
);

alter table public.client_drive_media_outbox drop constraint if exists client_drive_media_outbox_root_check;
alter table public.client_drive_media_outbox add constraint client_drive_media_outbox_root_check
  check (target_root_folder_id = '1Y8lNj4zpDXRA_ASUn0GCRmbtI9TE2QfI') not valid;
alter table public.client_drive_media_outbox drop constraint if exists client_drive_media_outbox_paths_check;
alter table public.client_drive_media_outbox add constraint client_drive_media_outbox_paths_check check (
  source_storage_path like client_id::text || '/%'
  and source_storage_path not like '%..%'
  and source_storage_path not like E'%\\%'
  and target_relative_path not like '%..%'
  and target_relative_path not like E'%\\%'
  and target_relative_path not like '/%'
  and target_relative_path not like '%//%'
  and target_file_name not like '%/%'
  and target_file_name not like E'%\\%'
) not valid;

drop policy if exists "cliente registra copia de solicitud en drive" on public.client_drive_media_outbox;
create policy "cliente registra copia de solicitud en drive" on public.client_drive_media_outbox for insert to authenticated
with check (
  client_id = auth.uid()
  and target_root_folder_id = '1Y8lNj4zpDXRA_ASUn0GCRmbtI9TE2QfI'
  and source_storage_path like auth.uid()::text || '/%'
  and target_relative_path like (
    select 'Clientes/' || p.public_id || E'\\_%/Solicitudes/SOL\\_%'
    from public.profiles p where p.id = auth.uid()
  ) escape E'\\'
  and status = 'pending' and attempts = 0 and drive_file_id is null
  and exists (
    select 1 from public.service_requests sr
    where sr.id = request_id and sr.client_id = auth.uid()
  )
  and exists (
    select 1 from public.client_request_attachments cra
    where cra.request_id = client_drive_media_outbox.request_id
      and cra.client_id = auth.uid()
      and cra.storage_path = source_storage_path
  )
);

alter table public.receipt_drive_outbox drop constraint if exists receipt_drive_paths_check;
alter table public.receipt_drive_outbox add constraint receipt_drive_paths_check check (
  source_storage_path like owner_id::text || '/%'
  and source_storage_path not like '%..%'
  and source_storage_path not like E'%\\%'
  and target_relative_path not like '%..%'
  and target_relative_path not like E'%\\%'
  and target_relative_path not like '/%'
  and target_relative_path not like '%//%'
  and target_file_name not like '%/%'
  and target_file_name not like E'%\\%'
) not valid;

