alter table public.provider_profiles
  add column if not exists training text check (char_length(training) <= 1200),
  add column if not exists certifications text[] not null default '{}',
  add column if not exists verified_at timestamptz,
  add column if not exists followers_count integer not null default 0 check (followers_count >= 0);

alter table public.membership_plans
  add column if not exists max_services integer not null default 2 check (max_services between 1 and 50);

update public.membership_plans set max_trades = 1, max_services = 2 where code = 'free';
update public.membership_plans set max_trades = 10, max_services = 10 where code = 'multioficio';

alter table public.provider_rate_items
  add column if not exists availability_start time,
  add column if not exists availability_end time,
  add column if not exists slot_position integer check (slot_position between 1 and 50);

create unique index if not exists provider_rate_items_slot_unique
on public.provider_rate_items(provider_id, slot_position)
where slot_position is not null and active;

create or replace function public.enforce_provider_service_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare allowed_services integer;
declare current_services integer;
begin
  select coalesce(mp.max_services, 2) into allowed_services
  from public.provider_memberships pm
  join public.membership_plans mp on mp.code = pm.plan_code
  where pm.provider_id = new.provider_id and pm.status in ('active','trialing');
  allowed_services := coalesce(allowed_services, 2);
  select count(*) into current_services
  from public.provider_rate_items
  where provider_id = new.provider_id and active and id <> new.id;
  if new.active and current_services >= allowed_services then
    raise exception 'El plan actual permite hasta % servicios', allowed_services;
  end if;
  return new;
end $$;

drop trigger if exists provider_service_limit on public.provider_rate_items;
create trigger provider_service_limit before insert or update on public.provider_rate_items
for each row execute function public.enforce_provider_service_limit();

create or replace function public.protect_provider_verification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then
    if TG_OP = 'INSERT' then new.verified_at := null;
    else new.verified_at := old.verified_at;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_provider_verification on public.provider_profiles;
create trigger protect_provider_verification before insert or update on public.provider_profiles
for each row execute function public.protect_provider_verification();

create table if not exists public.provider_followers (
  provider_id uuid not null references public.profiles(id) on delete cascade,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(provider_id, follower_id),
  check(provider_id <> follower_id)
);

alter table public.provider_followers enable row level security;

create policy "seguimientos propios" on public.provider_followers for select to authenticated
using(provider_id = auth.uid() or follower_id = auth.uid() or public.has_role('admin'));
create policy "seguir profesionales" on public.provider_followers for insert to authenticated
with check(follower_id = auth.uid());
create policy "dejar de seguir" on public.provider_followers for delete to authenticated
using(follower_id = auth.uid() or public.has_role('admin'));

create or replace function public.refresh_provider_followers_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_provider_id uuid;
begin
  target_provider_id := case when TG_OP = 'DELETE' then old.provider_id else new.provider_id end;
  update public.provider_profiles
  set followers_count = (select count(*) from public.provider_followers where provider_id = target_provider_id)
  where user_id = target_provider_id;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists refresh_provider_followers_count on public.provider_followers;
create trigger refresh_provider_followers_count after insert or delete on public.provider_followers
for each row execute function public.refresh_provider_followers_count();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "fotos perfil carga propia" on storage.objects for insert to authenticated
with check(bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos perfil actualiza propia" on storage.objects for update to authenticated
using(bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check(bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos perfil elimina propia" on storage.objects for delete to authenticated
using(bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
