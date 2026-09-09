create table if not exists public.certification_types (
  code text primary key,
  label text not null unique,
  requires_number boolean not null default false,
  number_label text,
  active boolean not null default true,
  position smallint not null default 1 check (position between 1 and 500),
  updated_at timestamptz not null default now(),
  check (not requires_number or char_length(coalesce(number_label, '')) >= 3)
);

alter table public.certification_types enable row level security;

create policy "diccionario certificaciones publico" on public.certification_types
for select to anon, authenticated using (active or public.has_role('admin'));

create policy "administracion gestiona certificaciones" on public.certification_types
for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

insert into public.certification_types(code, label, requires_number, number_label, position)
values
  ('matricula-vigente', 'Matrícula vigente', true, 'Número de matrícula', 1),
  ('identidad-verificada', 'Identidad verificada', false, null, 2),
  ('certificado-formacion', 'Certificado de formación', false, null, 3),
  ('curso-especializacion', 'Curso de especialización', false, null, 4),
  ('seguro-responsabilidad-civil', 'Seguro de responsabilidad civil', true, 'Número de póliza', 5),
  ('primeros-auxilios', 'Primeros auxilios', false, null, 6),
  ('manipulacion-alimentos', 'Manipulación de alimentos', true, 'Número de certificado', 7),
  ('antecedentes-verificados', 'Antecedentes verificados', false, null, 8),
  ('registro-conducir-profesional', 'Registro de conducir profesional', true, 'Número de licencia', 9),
  ('habilitacion-municipal', 'Habilitación municipal', true, 'Número de habilitación', 10)
on conflict(code) do update set
  label = excluded.label,
  requires_number = excluded.requires_number,
  number_label = excluded.number_label,
  position = excluded.position,
  active = true,
  updated_at = now();

alter table public.credentials
  add column if not exists credential_number text,
  add column if not exists review_notes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.credentials drop constraint if exists credentials_status_check;
alter table public.credentials add constraint credentials_status_check
  check (status in ('pending', 'verified', 'rejected'));

alter table public.credentials drop constraint if exists credentials_number_length;
alter table public.credentials add constraint credentials_number_length
  check (credential_number is null or char_length(credential_number) between 3 and 30);

create or replace function public.protect_credential_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    if TG_OP = 'INSERT' then
      new.status := 'pending';
      new.review_notes := null;
    else
      new.review_notes := old.review_notes;
      if new.private_path is distinct from old.private_path
        or new.credential_number is distinct from old.credential_number
        or new.kind is distinct from old.kind then
        new.status := 'pending';
      else
        new.status := old.status;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists protect_credential_review on public.credentials;
create trigger protect_credential_review before insert or update on public.credentials
for each row execute function public.protect_credential_review();

create policy "proveedor actualiza credencial" on public.credentials
for update to authenticated using (
  provider_id = auth.uid() or public.has_role('moderator') or public.has_role('admin')
) with check (
  provider_id = auth.uid() or public.has_role('moderator') or public.has_role('admin')
);

create policy "proveedor elimina credencial" on public.credentials
for delete to authenticated using (provider_id = auth.uid() or public.has_role('admin'));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('provider-credentials', 'provider-credentials', false, 3145728, array['image/jpeg'])
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "prestador carga comprobantes" on storage.objects
for insert to authenticated with check (
  bucket_id = 'provider-credentials' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "prestador actualiza comprobantes" on storage.objects
for update to authenticated using (
  bucket_id = 'provider-credentials' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('admin'))
) with check (
  bucket_id = 'provider-credentials' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('admin'))
);

create policy "prestador elimina comprobantes" on storage.objects
for delete to authenticated using (
  bucket_id = 'provider-credentials' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('admin'))
);

create policy "comprobantes privados" on storage.objects
for select to authenticated using (
  bucket_id = 'provider-credentials'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('moderator') or public.has_role('admin'))
);

insert into public.app_settings(key, value)
values('credential_verification', jsonb_build_object(
  'bucket', 'provider-credentials',
  'visibility', 'private',
  'max_image_side', 1600,
  'max_size_bytes', 3145728,
  'review_statuses', jsonb_build_array('pending', 'verified', 'rejected')
))
on conflict(key) do update set value = excluded.value, updated_at = now();
