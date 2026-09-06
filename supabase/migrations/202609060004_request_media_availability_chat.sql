alter table public.provider_profiles
  add column if not exists availability_start time not null default '08:00',
  add column if not exists availability_end time not null default '18:00';

alter table public.provider_profiles drop constraint if exists provider_profiles_availability_window;
alter table public.provider_profiles
  add constraint provider_profiles_availability_window check (availability_start < availability_end);

create table if not exists public.client_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  position smallint not null check (position between 1 and 3),
  image_width integer not null check (image_width between 1 and 1280),
  image_height integer not null check (image_height between 1 and 1280),
  size_bytes integer check (size_bytes is null or size_bytes between 1 and 2097152),
  drive_sync_status text not null default 'pending' check (drive_sync_status in ('pending','processing','synced','failed')),
  drive_file_id text,
  created_at timestamptz not null default now(),
  unique(request_id, position)
);

alter table public.client_request_attachments enable row level security;

create policy "participantes ven fotos de solicitud" on public.client_request_attachments
for select to authenticated using (
  exists (
    select 1 from public.service_requests sr
    where sr.id = request_id
      and (sr.client_id = auth.uid() or sr.provider_id = auth.uid() or public.has_role('admin'))
  )
);

create policy "cliente adjunta fotos a su solicitud" on public.client_request_attachments
for insert to authenticated with check (
  client_id = auth.uid()
  and exists (
    select 1 from public.service_requests sr
    where sr.id = request_id and sr.client_id = auth.uid()
  )
);

create policy "cliente elimina fotos de su solicitud" on public.client_request_attachments
for delete to authenticated using (client_id = auth.uid() or public.has_role('admin'));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('request-photos', 'request-photos', false, 2097152, array['image/jpeg'])
on conflict(id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "cliente carga fotos de solicitudes" on storage.objects
for insert to authenticated with check (
  bucket_id = 'request-photos' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "participantes leen fotos de solicitudes" on storage.objects
for select to authenticated using (
  bucket_id = 'request-photos'
  and exists (
    select 1
    from public.client_request_attachments cra
    join public.service_requests sr on sr.id = cra.request_id
    where cra.storage_path = name
      and (sr.client_id = auth.uid() or sr.provider_id = auth.uid() or public.has_role('admin'))
  )
);

create policy "cliente elimina fotos de solicitudes storage" on storage.objects
for delete to authenticated using (
  bucket_id = 'request-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('admin'))
);

create table if not exists public.client_drive_media_outbox (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null references public.service_requests(id) on delete cascade,
  source_storage_path text not null unique,
  target_root_folder_id text not null default '1Y8lNj4zpDXRA_ASUn0GCRmbtI9TE2QfI',
  target_relative_path text not null,
  target_file_name text not null,
  status text not null default 'pending' check (status in ('pending','processing','synced','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  drive_file_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_drive_media_outbox enable row level security;

create policy "cliente registra copia de solicitud en drive" on public.client_drive_media_outbox
for insert to authenticated with check (client_id = auth.uid() or public.has_role('admin'));

create policy "cliente ve copia de solicitud en drive" on public.client_drive_media_outbox
for select to authenticated using (client_id = auth.uid() or public.has_role('admin'));

insert into public.app_settings(key, value)
values('drive_client_requests', jsonb_build_object(
  'project_root_folder_id', '1Y8lNj4zpDXRA_ASUn0GCRmbtI9TE2QfI',
  'folder_pattern', 'Clientes/ID_Nombre_Apellido/Solicitudes/SOL_ID/foto-N.jpg',
  'max_photos', 3,
  'max_image_side', 1280
))
on conflict(key) do update set value = excluded.value, updated_at = now();

create or replace function public.enforce_internal_chat_rules() returns trigger
language plpgsql set search_path = '' as $$
declare sanitized_body text;
begin
  sanitized_body := new.body;
  sanitized_body := regexp_replace(sanitized_body, new.request_id::text, '', 'gi');
  if sanitized_body ~* '([[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|https?://|www\.|whatsapp|telegram|instagram|facebook|mi[[:space:]]+celu|escribime[[:space:]]+afuera|buscame[[:space:]]+en)' then
    raise exception using message = 'CONTACT_NOT_ALLOWED_IN_CHAT';
  end if;
  if sanitized_body ~* '([0-9][[:space:]().+_./-]*){8,15}' then
    raise exception using message = 'CONTACT_NOT_ALLOWED_IN_CHAT';
  end if;
  if sanitized_body ~* '(\$|\yars\y|pesos?|precio|cobro|cuesta|honorarios?)[^[:digit:]]{0,28}[[:digit:]]|[[:digit:]][^[:digit:]]{0,20}(\$|\yars\y|pesos?)' then
    raise exception using message = 'PRICE_NOT_ALLOWED_IN_CHAT';
  end if;
  return new;
end $$;

create or replace function public.issue_completion_token(target_job_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare raw_token text;
declare target_request_id uuid;
begin
  select j.request_id into target_request_id
  from public.jobs j
  where j.id = target_job_id and j.provider_id = auth.uid()
    and j.status in ('quote_accepted','payment_pending','payment_authorized','funds_held','scheduled','in_progress','completion_proposed','client_confirmation_pending')
  for update;
  if not found then raise exception using message = 'JOB_NOT_COMPLETABLE'; end if;

  raw_token := upper(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));
  update public.completion_tokens set used_at = now()
  where job_id = target_job_id and used_at is null;
  insert into public.completion_tokens(job_id, token_hash, expires_at)
  values(target_job_id, encode(digest(raw_token, 'sha256'), 'hex'), now() + interval '15 minutes');

  update public.jobs
  set status = 'client_confirmation_pending', updated_at = now()
  where id = target_job_id;
  update public.service_requests
  set status = 'client_confirmation_pending'
  where id = target_request_id;
  return raw_token;
end $$;

revoke all on function public.issue_completion_token(uuid) from public;
grant execute on function public.issue_completion_token(uuid) to authenticated;
