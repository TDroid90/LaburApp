-- Deliver existing in-app notifications to the owner's registered Expo devices.
-- No client can insert notifications under the current RLS policies.
create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_notification_push()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'to', token,
    'title', new.title,
    'body', new.body,
    'data', jsonb_build_object('notificationId', new.id, 'kind', new.kind),
    'channelId', 'general'
  )) into payload
  from public.push_tokens
  where user_id = new.user_id
    and platform = 'android'
    and (token like 'ExpoPushToken[%]' or token like 'ExponentPushToken[%]');

  if payload is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := payload,
      headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
      timeout_milliseconds := 5000
    );
  end if;
  return new;
end $$;

drop trigger if exists notifications_push_dispatch on public.notifications;
create trigger notifications_push_dispatch
after insert on public.notifications
for each row execute function public.dispatch_notification_push();

revoke all on function public.dispatch_notification_push() from public;
