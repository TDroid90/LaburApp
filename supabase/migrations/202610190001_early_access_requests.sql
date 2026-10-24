create table if not exists public.early_access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null unique check (char_length(email) between 5 and 254 and email = lower(email)),
  source text not null default 'laburapp_web' check (char_length(source) between 2 and 40),
  status text not null default 'pending' check (status in ('pending', 'tester_added', 'invited', 'installed', 'closed')),
  created_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now()
);

alter table public.early_access_requests enable row level security;

revoke all on table public.early_access_requests from anon, authenticated;

comment on table public.early_access_requests is
  'Solicitudes privadas de acceso anticipado recibidas desde laburapp.work. Sólo el backend con service role puede leerlas o modificarlas.';
