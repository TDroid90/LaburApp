-- Datos de contacto enviados desde el formulario público de Premium.
-- La fila conserva las mismas políticas privadas de subscription_requests.
alter table public.subscription_requests
  add column if not exists submission_name text,
  add column if not exists contact_whatsapp text;

alter table public.subscription_requests
  drop constraint if exists subscription_submission_name_length,
  add constraint subscription_submission_name_length
    check (submission_name is null or char_length(submission_name) between 2 and 100),
  drop constraint if exists subscription_contact_whatsapp_format,
  add constraint subscription_contact_whatsapp_format
    check (contact_whatsapp is null or contact_whatsapp ~ '^\+?[0-9][0-9 ()-]{6,20}$');
