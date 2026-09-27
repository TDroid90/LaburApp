-- Drive roots are deployment configuration. Clients enqueue validated relative
-- paths; the server-side worker selects the root for its own environment.
alter table public.drive_media_outbox drop constraint if exists drive_media_outbox_root_check;
alter table public.client_drive_media_outbox drop constraint if exists client_drive_media_outbox_root_check;
alter table public.receipt_drive_outbox drop constraint if exists receipt_drive_root;

alter table public.drive_media_outbox alter column target_root_folder_id drop default;
alter table public.drive_media_outbox alter column target_root_folder_id drop not null;
alter table public.client_drive_media_outbox alter column target_root_folder_id drop default;
alter table public.client_drive_media_outbox alter column target_root_folder_id drop not null;
alter table public.receipt_drive_outbox alter column target_root_folder_id drop default;
alter table public.receipt_drive_outbox alter column target_root_folder_id drop not null;

update public.drive_media_outbox set target_root_folder_id = null;
update public.client_drive_media_outbox set target_root_folder_id = null;
update public.receipt_drive_outbox set target_root_folder_id = null;

drop policy if exists "prestador registra copia en drive" on public.drive_media_outbox;
create policy "prestador registra copia en drive" on public.drive_media_outbox for insert to authenticated
with check (
  provider_id = auth.uid()
  and target_root_folder_id is null
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

drop policy if exists "cliente registra copia de solicitud en drive" on public.client_drive_media_outbox;
create policy "cliente registra copia de solicitud en drive" on public.client_drive_media_outbox for insert to authenticated
with check (
  client_id = auth.uid()
  and target_root_folder_id is null
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

drop policy if exists "titular solicita copia de comprobantes" on public.receipt_drive_outbox;
create policy "titular solicita copia de comprobantes" on public.receipt_drive_outbox for insert to authenticated
with check (
  owner_id = auth.uid()
  and target_root_folder_id is null
  and source_storage_path like auth.uid()::text || '/%'
  and target_relative_path not like '%..%'
  and status = 'pending' and attempts = 0 and drive_file_id is null
  and receipt_kind = 'subscription'
  and exists (
    select 1 from public.subscription_requests sr
    where sr.client_id = auth.uid() and sr.receipt_path = source_storage_path
  )
);

delete from public.app_settings
where key in ('drive_project_root_folder_id', 'drive_professionals_folder_id');
