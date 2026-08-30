create extension if not exists pgcrypto;

create type public.app_role as enum ('client','provider','moderator','admin');
create type public.job_status as enum ('request_created','request_sent','provider_reviewing','quote_sent','quote_revision_requested','quote_accepted','payment_pending','payment_authorized','funds_held','scheduled','in_progress','completion_proposed','client_confirmation_pending','completed','funds_released','cancelled','disputed','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  city text not null check (city in ('Río Grande','Ushuaia','Tolhuin')),
  avatar_path text,
  account_status text not null default 'active' check (account_status in ('active','pending_verification','warned','temporarily_suspended','permanently_suspended','deletion_requested','deleted')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (user_id uuid not null references public.profiles(id) on delete cascade, role public.app_role not null, primary key(user_id,role));
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null unique, requires_credential boolean not null default false, active boolean not null default true);
create table public.skills (id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id), name text not null, unique(category_id,name));
create table public.provider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id), bio text check(char_length(bio)<=600), zones text[] not null default '{}',
  published boolean not null default false, availability text, completed_jobs integer not null default 0 check(completed_jobs>=0), rating numeric(2,1), created_at timestamptz not null default now()
);
create table public.service_requests (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.profiles(id), provider_id uuid not null references public.profiles(id),
  description text not null check(char_length(description) between 10 and 2000), approximate_zone text, desired_at timestamptz, status public.job_status not null default 'request_created', created_at timestamptz not null default now()
);
create table public.quotes (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.service_requests(id) on delete cascade, version integer not null default 1,
  total numeric(12,2) not null check(total>=0), scope text not null, expires_at timestamptz, created_at timestamptz not null default now(), unique(request_id,version)
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(), request_id uuid not null unique references public.service_requests(id), client_id uuid not null references public.profiles(id), provider_id uuid not null references public.profiles(id),
  status public.job_status not null default 'quote_accepted', completed_counted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.job_events (id bigint generated always as identity primary key, job_id uuid not null references public.jobs(id) on delete cascade, actor_id uuid references public.profiles(id), from_status public.job_status, to_status public.job_status not null, metadata jsonb not null default '{}', created_at timestamptz not null default now());
create table public.messages (id uuid primary key default gen_random_uuid(), request_id uuid not null references public.service_requests(id) on delete cascade, sender_id uuid not null references public.profiles(id), body text not null check(char_length(body) between 1 and 2000), blocked_reason text, created_at timestamptz not null default now());
create table public.payments (id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id), provider text not null default 'mock' check(provider in ('mock','mercado_pago')), provider_event_id text unique, total numeric(12,2) not null, currency text not null default 'ARS', status text not null, created_at timestamptz not null default now());
create table public.platform_fee_snapshots (job_id uuid primary key references public.jobs(id), total numeric(12,2) not null, fee_rate numeric(5,4) not null, fee_amount numeric(12,2) not null, provider_net numeric(12,2) not null, fiscal_verified boolean not null, rule_name text not null, created_at timestamptz not null default now());
create table public.completion_tokens (id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id), token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now());
create table public.reviews (id uuid primary key default gen_random_uuid(), job_id uuid not null unique references public.jobs(id), client_id uuid not null references public.profiles(id), provider_id uuid not null references public.profiles(id), rating integer not null check(rating between 1 and 5), comment text check(char_length(comment)<=1200), moderated_at timestamptz, created_at timestamptz not null default now());
create table public.reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id), target_type text not null, target_id uuid not null, category text not null, details text, status text not null default 'open', priority text not null default 'normal', created_at timestamptz not null default now());
create table public.credentials (id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.profiles(id), kind text not null, number_masked text, private_path text not null, status text not null default 'pending', expires_at date, created_at timestamptz not null default now());
create table public.audit_logs (id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), action text not null, target_type text not null, target_id text not null, before_data jsonb, after_data jsonb, reason text, created_at timestamptz not null default now());
create table public.rank_definitions (minimum_jobs integer primary key check(minimum_jobs>=0), name text not null unique);
create table public.app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());

create or replace function public.has_role(required_role public.app_role) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role=required_role) $$;
revoke all on function public.has_role(public.app_role) from public; grant execute on function public.has_role(public.app_role) to authenticated;

alter table public.profiles enable row level security; alter table public.user_roles enable row level security; alter table public.categories enable row level security; alter table public.skills enable row level security; alter table public.provider_profiles enable row level security; alter table public.service_requests enable row level security; alter table public.quotes enable row level security; alter table public.jobs enable row level security; alter table public.job_events enable row level security; alter table public.messages enable row level security; alter table public.payments enable row level security; alter table public.platform_fee_snapshots enable row level security; alter table public.completion_tokens enable row level security; alter table public.reviews enable row level security; alter table public.reports enable row level security; alter table public.credentials enable row level security; alter table public.audit_logs enable row level security; alter table public.rank_definitions enable row level security; alter table public.app_settings enable row level security;

create policy "perfil propio" on public.profiles for all to authenticated using(id=auth.uid() or public.has_role('admin')) with check(id=auth.uid() or public.has_role('admin'));
create policy "roles propios lectura" on public.user_roles for select to authenticated using(user_id=auth.uid() or public.has_role('admin'));
create policy "catalogo publico" on public.categories for select using(active); create policy "skills publicas" on public.skills for select using(true);
create policy "prestadores publicados" on public.provider_profiles for select using(published or user_id=auth.uid() or public.has_role('admin'));
create policy "prestador administra perfil" on public.provider_profiles for all to authenticated using(user_id=auth.uid() or public.has_role('admin')) with check(user_id=auth.uid() or public.has_role('admin'));
create policy "participantes ven solicitudes" on public.service_requests for select to authenticated using(client_id=auth.uid() or provider_id=auth.uid() or public.has_role('moderator') or public.has_role('admin'));
create policy "cliente crea solicitud" on public.service_requests for insert to authenticated with check(client_id=auth.uid());
create policy "participantes ven trabajos" on public.jobs for select to authenticated using(client_id=auth.uid() or provider_id=auth.uid() or public.has_role('admin'));
create policy "participantes ven mensajes" on public.messages for select to authenticated using(exists(select 1 from public.service_requests r where r.id=request_id and (r.client_id=auth.uid() or r.provider_id=auth.uid())) or public.has_role('moderator') or public.has_role('admin'));
create policy "participantes envian mensajes" on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.service_requests r where r.id=request_id and (r.client_id=auth.uid() or r.provider_id=auth.uid())));
create policy "credenciales privadas" on public.credentials for select to authenticated using(provider_id=auth.uid() or public.has_role('moderator') or public.has_role('admin'));
create policy "proveedor carga credencial" on public.credentials for insert to authenticated with check(provider_id=auth.uid());
create policy "cliente denuncia" on public.reports for insert to authenticated with check(reporter_id=auth.uid());
create policy "moderacion ve denuncias" on public.reports for select to authenticated using(reporter_id=auth.uid() or public.has_role('moderator') or public.has_role('admin'));
create policy "resenas publicas" on public.reviews for select using(moderated_at is null);
create policy "rangos publicos" on public.rank_definitions for select using(true);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
('portfolio','portfolio',true,10485760,array['image/jpeg','image/png','image/webp']),
('private-documents','private-documents',false,10485760,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do nothing;
