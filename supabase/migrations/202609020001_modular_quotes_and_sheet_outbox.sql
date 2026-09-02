alter table public.quotes
  add column if not exists pricing_mode text not null default 'itemized' check (pricing_mode in ('itemized','fixed','starting_at')),
  add column if not exists items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  add column if not exists eta text,
  add column if not exists notes text check (char_length(notes) <= 2000),
  add column if not exists valid_days integer not null default 7 check (valid_days between 1 and 90);

create table if not exists public.sheet_mirror_outbox (
  id uuid primary key default gen_random_uuid(),
  tab text not null check (tab in ('Usuarios','Contactos','Presupuestos')),
  entity_type text not null,
  entity_id text not null,
  operation text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.sheet_mirror_outbox enable row level security;
revoke all on public.sheet_mirror_outbox from anon, authenticated;

create or replace function public.enqueue_sheet_mirror() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_tab text;
begin
  target_tab := case TG_TABLE_NAME when 'profiles' then 'Usuarios' when 'service_requests' then 'Contactos' when 'quotes' then 'Presupuestos' end;
  insert into public.sheet_mirror_outbox(tab, entity_type, entity_id, operation, payload)
  values(target_tab, TG_TABLE_NAME, coalesce((to_jsonb(new)->>'id'), (to_jsonb(new)->>'user_id')), TG_OP, to_jsonb(new));
  return new;
end $$;

drop trigger if exists profiles_sheet_mirror on public.profiles;
create trigger profiles_sheet_mirror after insert or update on public.profiles for each row execute function public.enqueue_sheet_mirror();
drop trigger if exists requests_sheet_mirror on public.service_requests;
create trigger requests_sheet_mirror after insert or update on public.service_requests for each row execute function public.enqueue_sheet_mirror();
drop trigger if exists quotes_sheet_mirror on public.quotes;
create trigger quotes_sheet_mirror after insert or update on public.quotes for each row execute function public.enqueue_sheet_mirror();
