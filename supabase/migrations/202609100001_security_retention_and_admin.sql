alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

alter table public.credentials
  alter column private_path drop not null,
  add column if not exists review_deadline_at timestamptz not null default (now() + interval '24 hours'),
  add column if not exists verified_at timestamptz,
  add column if not exists review_due_at timestamptz,
  add column if not exists document_purge_at timestamptz,
  add column if not exists document_deleted_at timestamptz;

alter table public.credentials drop constraint if exists credentials_status_check;
alter table public.credentials add constraint credentials_status_check
  check (status in ('pending', 'verified', 'rejected', 'expired'));

create or replace function public.protect_credential_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare reviewer boolean;
begin
  reviewer := auth.role() = 'service_role' or public.has_role('admin') or public.has_role('moderator');

  if not reviewer then
    if TG_OP = 'INSERT' then
      new.status := 'pending';
      new.review_notes := null;
      new.review_deadline_at := now() + interval '24 hours';
      new.verified_at := null;
      new.review_due_at := null;
      new.document_purge_at := null;
      new.document_deleted_at := null;
    else
      new.review_notes := old.review_notes;
      if new.private_path is distinct from old.private_path
        or new.credential_number is distinct from old.credential_number
        or new.kind is distinct from old.kind then
        new.status := 'pending';
        new.review_deadline_at := now() + interval '24 hours';
        new.verified_at := null;
        new.review_due_at := null;
        new.document_purge_at := null;
        new.document_deleted_at := null;
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
      new.verified_at := now();
      new.review_due_at := now() + interval '6 months';
      new.document_purge_at := now() + interval '24 hours';
    elsif new.status = 'rejected' then
      new.document_purge_at := now() + interval '24 hours';
      new.review_due_at := null;
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;

create or replace function public.complete_password_change() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  update public.profiles set must_change_password = false, updated_at = now() where id = auth.uid();
  insert into public.audit_logs(actor_id, action, target_type, target_id, reason)
  values(auth.uid(), 'password_changed', 'profiles', auth.uid()::text, 'Cambio seguro confirmado por el usuario');
end $$;

revoke all on function public.complete_password_change() from public;
grant execute on function public.complete_password_change() to authenticated;

insert into public.app_settings(key, value)
values('credential_retention', jsonb_build_object(
  'review_target_hours', 24,
  'renewal_months', 6,
  'document_delete_after_review_hours', 24,
  'stores_passwords_in_sheets', false
))
on conflict(key) do update set value = excluded.value, updated_at = now();
