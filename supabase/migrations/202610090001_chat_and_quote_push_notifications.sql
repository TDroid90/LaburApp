-- Push notifications for the two events that matter most during an active job.
-- The existing notifications_push_dispatch trigger delivers these rows to Expo devices.
create or replace function public.notify_message_recipient() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recipient_id uuid;
  sender_name text;
begin
  select case when r.client_id = new.sender_id then r.provider_id else r.client_id end
    into recipient_id
  from public.service_requests r
  where r.id = new.request_id;

  select coalesce(p.full_name, 'Tu contacto') into sender_name
  from public.profiles p where p.id = new.sender_id;

  if recipient_id is not null then
    insert into public.notifications(user_id, kind, title, body, data)
    values (
      recipient_id,
      'chat_message',
      'Nuevo mensaje en LaburApp',
      left(coalesce(sender_name, 'Tu contacto') || ': ' || new.body, 600),
      jsonb_build_object('request_id', new.request_id, 'action', 'open_chat')
    );
  end if;
  return new;
end $$;

drop trigger if exists notify_message_recipient on public.messages;
create trigger notify_message_recipient
after insert on public.messages
for each row execute function public.notify_message_recipient();

create or replace function public.notify_quote_accepted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'quote_accepted' and coalesce(old.status::text, '') <> 'quote_accepted' then
    insert into public.notifications(user_id, kind, title, body, data)
    values (
      new.provider_id,
      'quote_accepted',
      'Presupuesto aceptado',
      'El cliente aceptó tu presupuesto. Revisá el trabajo y coordiná los detalles en el chat.',
      jsonb_build_object('request_id', new.request_id, 'job_id', (select id from public.jobs where request_id = new.request_id), 'action', 'open_job')
    );
  end if;
  return new;
end $$;

drop trigger if exists notify_quote_accepted on public.service_requests;
create trigger notify_quote_accepted
after update of status on public.service_requests
for each row execute function public.notify_quote_accepted();

revoke all on function public.notify_message_recipient() from public;
revoke all on function public.notify_quote_accepted() from public;
