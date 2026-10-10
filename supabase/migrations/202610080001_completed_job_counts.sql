-- El contador público incluye sólo trabajos terminados y confirmados.
create or replace function public.refresh_provider_completed_jobs() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target_provider_id uuid;
begin
  if TG_OP = 'DELETE' then
    target_provider_id := old.provider_id;
  else
    target_provider_id := new.provider_id;
  end if;

  update public.provider_profiles pp
  set completed_jobs = (
    select count(*)::integer
    from public.jobs j
    where j.provider_id = target_provider_id
      and j.status = 'completed'
      and j.completion_verified_at is not null
  )
  where pp.user_id = target_provider_id;

  if TG_OP = 'UPDATE' and old.provider_id is distinct from new.provider_id then
    update public.provider_profiles pp
    set completed_jobs = (
      select count(*)::integer
      from public.jobs j
      where j.provider_id = old.provider_id
        and j.status = 'completed'
        and j.completion_verified_at is not null
    )
    where pp.user_id = old.provider_id;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists refresh_provider_completed_jobs on public.jobs;
create trigger refresh_provider_completed_jobs
after insert or delete or update of status, completion_verified_at, provider_id on public.jobs
for each row execute function public.refresh_provider_completed_jobs();

update public.provider_profiles pp
set completed_jobs = (
  select count(*)::integer
  from public.jobs j
  where j.provider_id = pp.user_id
    and j.status = 'completed'
    and j.completion_verified_at is not null
);
