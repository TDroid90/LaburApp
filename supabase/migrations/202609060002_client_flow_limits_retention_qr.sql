alter table public.service_requests
  add column if not exists expires_at timestamptz not null default (now() + interval '5 days'),
  add column if not exists accepted_at timestamptz,
  add column if not exists completion_verified_at timestamptz;

update public.service_requests
set expires_at = least(coalesce(expires_at, created_at + interval '5 days'), created_at + interval '5 days');

update public.quotes set valid_days = least(coalesce(valid_days, 5), 5);
alter table public.quotes drop constraint if exists quotes_valid_days_check;
alter table public.quotes
  add constraint quotes_valid_days_check check (valid_days between 1 and 5);

alter table public.messages
  add column if not exists expires_at timestamptz not null default (now() + interval '5 days');

alter table public.jobs
  add column if not exists completion_verified_at timestamptz;

alter table public.reviews
  add column if not exists qualities text[] not null default '{}';

alter table public.reviews drop constraint if exists reviews_qualities_limit;
alter table public.reviews
  add constraint reviews_qualities_limit check (cardinality(qualities) <= 3);

create table if not exists public.client_memberships (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  plan_code text not null default 'free' check (plan_code in ('free', 'plus')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'cancelled')),
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.client_memberships(client_id)
select id from public.profiles
on conflict(client_id) do nothing;

alter table public.client_memberships enable row level security;

drop policy if exists "cliente ve su membresia" on public.client_memberships;
create policy "cliente ve su membresia" on public.client_memberships
for select to authenticated
using (client_id = auth.uid() or public.has_role('admin'));

drop policy if exists "admin administra membresias cliente" on public.client_memberships;
create policy "admin administra membresias cliente" on public.client_memberships
for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

create or replace function public.ensure_client_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.client_memberships(client_id) values(new.id)
  on conflict(client_id) do nothing;
  return new;
end $$;

drop trigger if exists ensure_client_membership on public.profiles;
create trigger ensure_client_membership
after insert on public.profiles
for each row execute function public.ensure_client_membership();

create or replace function public.enforce_client_weekly_request_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare is_paid boolean;
declare weekly_requests integer;
begin
  select exists(
    select 1 from public.client_memberships cm
    where cm.client_id = new.client_id
      and cm.plan_code <> 'free'
      and cm.status in ('active', 'trialing')
      and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
  ) into is_paid;

  if not is_paid then
    select count(*) into weekly_requests
    from public.service_requests sr
    where sr.client_id = new.client_id
      and sr.created_at >= date_trunc('week', now())
      and sr.status <> 'cancelled';
    if weekly_requests >= 3 then
      raise exception using message = 'FREE_WEEKLY_REQUEST_LIMIT';
    end if;
  end if;

  new.expires_at := least(coalesce(new.expires_at, now() + interval '5 days'), now() + interval '5 days');
  return new;
end $$;

drop trigger if exists client_weekly_request_limit on public.service_requests;
create trigger client_weekly_request_limit
before insert on public.service_requests
for each row execute function public.enforce_client_weekly_request_limit();

create or replace function public.refresh_chat_retention() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.expires_at := now() + interval '5 days';
  update public.messages
  set expires_at = new.expires_at
  where request_id = new.request_id;
  return new;
end $$;

drop trigger if exists refresh_chat_retention on public.messages;
create trigger refresh_chat_retention
before insert on public.messages
for each row execute function public.refresh_chat_retention();

create or replace function public.enforce_internal_chat_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.body ~* '([[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|https?://|www\.|whatsapp|telegram|instagram|facebook)' then
    raise exception using message = 'CONTACT_NOT_ALLOWED_IN_CHAT';
  end if;
  if new.body ~* '(\$|\yars\y|pesos?|precio|cobro|cuesta|honorarios?)[^[:digit:]]{0,28}[[:digit:]]|[[:digit:]][^[:digit:]]{0,20}(\$|\yars\y|pesos?)' then
    raise exception using message = 'PRICE_NOT_ALLOWED_IN_CHAT';
  end if;
  return new;
end $$;

drop trigger if exists enforce_internal_chat_rules on public.messages;
create trigger enforce_internal_chat_rules
before insert on public.messages
for each row execute function public.enforce_internal_chat_rules();

create or replace function public.accept_service_quote(target_request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare selected_request public.service_requests;
declare selected_quote public.quotes;
declare created_job_id uuid;
begin
  select * into selected_request from public.service_requests
  where id = target_request_id and client_id = auth.uid()
  for update;
  if not found or selected_request.status <> 'quote_sent' or selected_request.expires_at <= now() then
    raise exception using message = 'QUOTE_NOT_ACCEPTABLE';
  end if;
  select * into selected_quote from public.quotes
  where request_id = target_request_id and coalesce(expires_at, now() + interval '1 second') > now()
  order by version desc limit 1;
  if not found then raise exception using message = 'QUOTE_NOT_ACCEPTABLE'; end if;

  update public.service_requests
  set status = 'quote_accepted', accepted_at = now()
  where id = target_request_id;
  insert into public.jobs(request_id, client_id, provider_id, status)
  values(target_request_id, selected_request.client_id, selected_request.provider_id, 'quote_accepted')
  on conflict(request_id) do update set status = excluded.status, updated_at = now()
  returning id into created_job_id;
  return created_job_id;
end $$;

create or replace function public.cancel_service_request(target_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.service_requests
  set status = 'cancelled'
  where id = target_request_id
    and client_id = auth.uid()
    and status in ('request_created','request_sent','provider_reviewing','quote_sent','quote_revision_requested');
  if not found then raise exception using message = 'REQUEST_NOT_CANCELLABLE'; end if;
end $$;

create or replace function public.request_quote_revision(target_request_id uuid, revision_message text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if char_length(trim(revision_message)) < 10 then
    raise exception using message = 'REVISION_MESSAGE_REQUIRED';
  end if;
  update public.service_requests
  set status = 'quote_revision_requested', expires_at = least(expires_at, now() + interval '5 days')
  where id = target_request_id and client_id = auth.uid() and status = 'quote_sent';
  if not found then raise exception using message = 'QUOTE_NOT_REVISIONABLE'; end if;
  insert into public.messages(request_id, sender_id, body)
  values(target_request_id, auth.uid(), trim(revision_message));
end $$;

create or replace function public.issue_completion_token(target_job_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare raw_token text;
begin
  if not exists(
    select 1 from public.jobs j
    where j.id = target_job_id and j.provider_id = auth.uid()
      and j.status in ('quote_accepted','payment_pending','payment_authorized','funds_held','scheduled','in_progress','completion_proposed','client_confirmation_pending')
  ) then raise exception using message = 'JOB_NOT_COMPLETABLE'; end if;
  raw_token := upper(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));
  update public.completion_tokens set used_at = now()
  where job_id = target_job_id and used_at is null;
  insert into public.completion_tokens(job_id, token_hash, expires_at)
  values(target_job_id, encode(digest(raw_token, 'sha256'), 'hex'), now() + interval '15 minutes');
  return raw_token;
end $$;

create or replace function public.confirm_completion_token(raw_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare selected_token public.completion_tokens;
declare selected_job public.jobs;
begin
  select * into selected_token from public.completion_tokens
  where token_hash = encode(digest(upper(trim(raw_token)), 'sha256'), 'hex')
    and used_at is null and expires_at > now()
  for update;
  if not found then raise exception using message = 'INVALID_OR_EXPIRED_QR'; end if;
  select * into selected_job from public.jobs where id = selected_token.job_id for update;
  if selected_job.client_id <> auth.uid() then raise exception using message = 'QR_NOT_FOR_CLIENT'; end if;

  update public.completion_tokens set used_at = now() where id = selected_token.id;
  update public.jobs
  set status = 'completed', completion_verified_at = now(), completed_counted_at = coalesce(completed_counted_at, now()), updated_at = now()
  where id = selected_job.id;
  update public.service_requests
  set status = 'completed', completion_verified_at = now()
  where id = selected_job.request_id;
  return selected_job.request_id;
end $$;

create or replace function public.purge_expired_client_data() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.messages where expires_at <= now();
  delete from public.service_requests sr
  where sr.expires_at <= now()
    and sr.status in ('request_created','request_sent','provider_reviewing','quote_sent','quote_revision_requested','cancelled')
    and not exists(select 1 from public.jobs j where j.request_id = sr.id);
end $$;

revoke all on function public.accept_service_quote(uuid) from public;
revoke all on function public.cancel_service_request(uuid) from public;
revoke all on function public.request_quote_revision(uuid, text) from public;
revoke all on function public.issue_completion_token(uuid) from public;
revoke all on function public.confirm_completion_token(text) from public;
revoke all on function public.purge_expired_client_data() from public;
grant execute on function public.accept_service_quote(uuid) to authenticated;
grant execute on function public.cancel_service_request(uuid) to authenticated;
grant execute on function public.request_quote_revision(uuid, text) to authenticated;
grant execute on function public.issue_completion_token(uuid) to authenticated;
grant execute on function public.confirm_completion_token(text) to authenticated;
grant execute on function public.purge_expired_client_data() to authenticated;

drop policy if exists "cliente crea resena verificada" on public.reviews;
create policy "cliente crea resena verificada" on public.reviews
for insert to authenticated
with check (
  client_id = auth.uid()
  and cardinality(qualities) <= 3
  and exists(
    select 1 from public.jobs j
    where j.id = job_id and j.client_id = auth.uid() and j.provider_id = provider_id
      and j.completion_verified_at is not null
      and j.status in ('completed','funds_released')
  )
);
