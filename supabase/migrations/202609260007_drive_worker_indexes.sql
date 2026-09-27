-- Targeted indexes for the actual worker/cleanup access paths. Broader advisor
-- suggestions remain deferred until production-like volume can be measured.
create index if not exists drive_media_outbox_owner_status_created_idx
  on public.drive_media_outbox(provider_id, status, created_at);
create index if not exists client_drive_media_outbox_owner_status_created_idx
  on public.client_drive_media_outbox(client_id, status, created_at);
create index if not exists receipt_drive_outbox_owner_status_created_idx
  on public.receipt_drive_outbox(owner_id, status, created_at);
create index if not exists drive_cleanup_outbox_status_created_idx
  on public.drive_cleanup_outbox(status, created_at)
  where status in ('pending', 'failed');
