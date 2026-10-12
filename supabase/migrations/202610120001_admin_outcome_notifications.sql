-- Notificaciones de resultado administradas en servidor.
-- El trigger existente de push sobre public.notifications las entrega a Expo.

create or replace function public.notify_credential_review_outcome()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  credential_owner uuid;
begin
  if new.status is not distinct from old.status or new.status not in ('verified', 'rejected') then
    return new;
  end if;

  select c.provider_id into credential_owner
  from public.credentials c
  where c.id = new.id;

  if credential_owner is not null then
    insert into public.notifications(user_id, kind, title, body, data)
    values (
      credential_owner,
      case when new.status = 'verified' then 'credential_approved' else 'credential_rejected' end,
      case when new.status = 'verified' then 'Certificación aceptada' else 'Certificación rechazada' end,
      case when new.status = 'verified'
        then 'Tu certificación "' || new.kind || '" fue revisada y aceptada.'
        else 'Tu certificación "' || new.kind || '" necesita una corrección. Revisá las observaciones en tu perfil.'
      end,
      jsonb_build_object('credential_id', new.id, 'status', new.status, 'action', 'open_profile')
    );
  end if;
  return new;
end $$;

drop trigger if exists credentials_review_outcome_notification on public.credentials;
create trigger credentials_review_outcome_notification
after update of status on public.credentials
for each row execute function public.notify_credential_review_outcome();

create or replace function public.notify_premium_activation()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.plan_code = 'plus' and new.status = 'active'
     and (tg_op = 'INSERT' or old.plan_code is distinct from 'plus' or old.status is distinct from 'active') then
    insert into public.notifications(user_id, kind, title, body, data)
    values (
      new.client_id,
      'premium_activated',
      'Premium habilitado',
      'Tu cuenta ya tiene Premium activo. Disfrutá las funciones ampliadas durante la vigencia asignada.',
      jsonb_build_object('plan_months', new.active_plan_months, 'period_ends_at', new.current_period_ends_at, 'action', 'open_profile')
    );
  end if;
  return new;
end $$;

drop trigger if exists client_membership_premium_notification on public.client_memberships;
create trigger client_membership_premium_notification
after insert or update of plan_code, status on public.client_memberships
for each row execute function public.notify_premium_activation();

revoke all on function public.notify_credential_review_outcome() from public;
revoke all on function public.notify_premium_activation() from public;
