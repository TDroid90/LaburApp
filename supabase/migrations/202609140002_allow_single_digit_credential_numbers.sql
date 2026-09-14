alter table public.credentials
  drop constraint if exists credentials_number_length;

alter table public.credentials
  add constraint credentials_number_length
  check (credential_number is null or char_length(trim(credential_number)) between 1 and 30);

update public.certification_types
set verification_interval_months = 12,
    updated_at = now();

create or replace function public.apply_annual_credential_review_due()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'verified'
    and (
      tg_op = 'INSERT'
      or old.status is distinct from new.status
      or old.expires_at is distinct from new.expires_at
      or old.verified_at is distinct from new.verified_at
    ) then
    new.review_due_at := case
      when new.expires_at is not null then new.expires_at::timestamptz
      else coalesce(new.verified_at, now()) + interval '1 year'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists zz_apply_annual_credential_review_due on public.credentials;
create trigger zz_apply_annual_credential_review_due
before insert or update on public.credentials
for each row execute function public.apply_annual_credential_review_due();

update public.credentials
set review_due_at = case
  when expires_at is not null then expires_at::timestamptz
  else coalesce(verified_at, updated_at) + interval '1 year'
end
where status = 'verified';

insert into public.app_settings(key, value)
values('credential_retention', jsonb_build_object(
  'review_target_days', 5,
  'document_max_retention_days', 5,
  'document_delete_after_review_hours', 48,
  'ocr_temporary_data_hours', 48,
  'default_renewal_months', 12,
  'identity_renewal_months', 12,
  'stores_passwords_in_sheets', false
))
on conflict(key) do update set value = excluded.value, updated_at = now();
