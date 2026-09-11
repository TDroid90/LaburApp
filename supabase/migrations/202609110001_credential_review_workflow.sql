alter table public.certification_types
  add column if not exists verification_interval_months smallint not null default 36
    check (verification_interval_months between 1 and 120),
  add column if not exists registry_source text;

update public.certification_types
set verification_interval_months = case when code = 'identidad-verificada' then 12 else 36 end,
    registry_source = case
      when code = 'matricula-vigente' then 'manual-select'
      else registry_source
    end,
    updated_at = now();

alter table public.credentials
  add column if not exists ocr_status text not null default 'not_requested'
    check (ocr_status in ('not_requested', 'processing', 'completed', 'failed')),
  add column if not exists ocr_text text,
  add column if not exists ocr_fields jsonb not null default '{}'::jsonb,
  add column if not exists ocr_purge_at timestamptz,
  add column if not exists ocr_deleted_at timestamptz,
  add column if not exists registry_source text,
  add column if not exists registry_match_status text not null default 'not_checked'
    check (registry_match_status in ('not_checked', 'matched', 'not_found', 'manual_required')),
  add column if not exists registry_match_data jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz;

create or replace function public.protect_credential_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  reviewer boolean;
  renewal_months integer;
  policy_due timestamptz;
begin
  reviewer := auth.role() = 'service_role' or public.has_role('admin') or public.has_role('moderator');

  if not reviewer then
    if TG_OP = 'INSERT' then
      new.status := 'pending';
      new.review_notes := null;
      new.review_deadline_at := now() + interval '5 days';
      new.verified_at := null;
      new.review_due_at := null;
      new.document_purge_at := now() + interval '5 days';
      new.document_deleted_at := null;
      new.ocr_status := 'not_requested';
      new.ocr_text := null;
      new.ocr_fields := '{}'::jsonb;
      new.ocr_purge_at := null;
      new.ocr_deleted_at := null;
      new.registry_source := null;
      new.registry_match_status := 'not_checked';
      new.registry_match_data := '{}'::jsonb;
      new.reviewed_by := null;
      new.reviewed_at := null;
    else
      new.review_notes := old.review_notes;
      new.ocr_status := old.ocr_status;
      new.ocr_text := old.ocr_text;
      new.ocr_fields := old.ocr_fields;
      new.ocr_purge_at := old.ocr_purge_at;
      new.ocr_deleted_at := old.ocr_deleted_at;
      new.registry_source := old.registry_source;
      new.registry_match_status := old.registry_match_status;
      new.registry_match_data := old.registry_match_data;
      new.reviewed_by := old.reviewed_by;
      new.reviewed_at := old.reviewed_at;

      if new.private_path is distinct from old.private_path
        or new.credential_number is distinct from old.credential_number
        or new.kind is distinct from old.kind then
        new.status := 'pending';
        new.review_deadline_at := now() + interval '5 days';
        new.verified_at := null;
        new.review_due_at := null;
        new.document_purge_at := now() + interval '5 days';
        new.document_deleted_at := null;
        new.ocr_status := 'not_requested';
        new.ocr_text := null;
        new.ocr_fields := '{}'::jsonb;
        new.ocr_purge_at := null;
        new.ocr_deleted_at := null;
        new.registry_source := null;
        new.registry_match_status := 'not_checked';
        new.registry_match_data := '{}'::jsonb;
        new.reviewed_by := null;
        new.reviewed_at := null;
      else
        new.status := old.status;
        new.review_deadline_at := old.review_deadline_at;
        new.verified_at := old.verified_at;
        new.review_due_at := old.review_due_at;
        new.document_purge_at := old.document_purge_at;
        new.document_deleted_at := old.document_deleted_at;
      end if;
    end if;
  elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'verified' then
      select verification_interval_months into renewal_months
      from public.certification_types where label = new.kind and active limit 1;
      policy_due := now() + make_interval(months => coalesce(renewal_months, 36));
      new.verified_at := now();
      new.review_due_at := case
        when new.expires_at is not null then least(policy_due, new.expires_at::timestamptz)
        else policy_due
      end;
      new.document_purge_at := least(coalesce(old.document_purge_at, now() + interval '5 days'), now() + interval '48 hours');
    elsif new.status = 'rejected' then
      new.document_purge_at := least(coalesce(old.document_purge_at, now() + interval '5 days'), now() + interval '48 hours');
      new.review_due_at := null;
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;

  new.updated_at := now();
  return new;
end $$;

create or replace function public.admin_review_credential(
  p_credential_id uuid,
  p_status text,
  p_notes text default null,
  p_ocr_text text default null,
  p_ocr_fields jsonb default '{}'::jsonb,
  p_registry_source text default null,
  p_registry_match_status text default 'not_checked',
  p_registry_match_data jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then raise exception 'Acceso administrativo requerido'; end if;
  if p_status not in ('verified', 'rejected') then raise exception 'Estado de revisión inválido'; end if;
  if p_registry_match_status not in ('not_checked', 'matched', 'not_found', 'manual_required') then
    raise exception 'Resultado de padrón inválido';
  end if;

  update public.credentials set
    status = p_status,
    review_notes = nullif(trim(p_notes), ''),
    ocr_status = case when nullif(trim(p_ocr_text), '') is null then ocr_status else 'completed' end,
    ocr_text = nullif(trim(p_ocr_text), ''),
    ocr_fields = coalesce(p_ocr_fields, '{}'::jsonb),
    ocr_purge_at = case when nullif(trim(p_ocr_text), '') is null then ocr_purge_at else now() + interval '48 hours' end,
    ocr_deleted_at = null,
    registry_source = p_registry_source,
    registry_match_status = p_registry_match_status,
    registry_match_data = coalesce(p_registry_match_data, '{}'::jsonb)
  where id = p_credential_id;

  if not found then raise exception 'Credencial inexistente'; end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, reason)
  values(auth.uid(), 'credential_reviewed', 'credentials', p_credential_id::text,
    concat('Estado: ', p_status, '. Padrón: ', p_registry_match_status));
end $$;

revoke all on function public.admin_review_credential(uuid, text, text, text, jsonb, text, text, jsonb) from public;
grant execute on function public.admin_review_credential(uuid, text, text, text, jsonb, text, text, jsonb) to authenticated;

update public.credentials
set review_deadline_at = created_at + interval '5 days',
    document_purge_at = coalesce(document_purge_at, created_at + interval '5 days')
where status = 'pending' and private_path is not null;

update public.credentials c
set review_due_at = case
  when c.expires_at is not null then least(
    coalesce(c.verified_at, c.updated_at) + make_interval(months => ct.verification_interval_months),
    c.expires_at::timestamptz
  )
  else coalesce(c.verified_at, c.updated_at) + make_interval(months => ct.verification_interval_months)
end
from public.certification_types ct
where c.status = 'verified' and ct.label = c.kind;

insert into public.app_settings(key, value)
values('credential_retention', jsonb_build_object(
  'review_target_days', 5,
  'document_max_retention_days', 5,
  'document_delete_after_review_hours', 48,
  'ocr_temporary_data_hours', 48,
  'default_renewal_months', 36,
  'identity_renewal_months', 12,
  'stores_passwords_in_sheets', false
))
on conflict(key) do update set value = excluded.value, updated_at = now();
