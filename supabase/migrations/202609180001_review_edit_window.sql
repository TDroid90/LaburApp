-- Una reseña verificada por trabajo. Puede editarse únicamente durante cinco minutos.
drop policy if exists "cliente crea resena verificada" on public.reviews;
create policy "cliente crea resena verificada" on public.reviews
for insert to authenticated with check (
  client_id = auth.uid()
  and cardinality(qualities) <= case when exists (
    select 1 from public.client_memberships cm
    where cm.client_id = auth.uid() and cm.plan_code = 'plus' and cm.status = 'active'
      and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
  ) then 6 else 3 end
  and exists (
    select 1 from public.jobs j
    where j.id = job_id and j.client_id = auth.uid() and j.provider_id = provider_id
      and j.completion_verified_at is not null and j.status in ('completed', 'funds_released')
  )
);

drop policy if exists "cliente edita resena cinco minutos" on public.reviews;
create policy "cliente edita resena cinco minutos" on public.reviews
for update to authenticated
using (client_id = auth.uid() and created_at > now() - interval '5 minutes' and moderated_at is null)
with check (
  client_id = auth.uid() and created_at > now() - interval '5 minutes'
  and cardinality(qualities) <= case when exists (
    select 1 from public.client_memberships cm
    where cm.client_id = auth.uid() and cm.plan_code = 'plus' and cm.status = 'active'
      and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
  ) then 6 else 3 end
);

create or replace function public.protect_review_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.has_role('admin') then return new; end if;
  if new.id is distinct from old.id or new.job_id is distinct from old.job_id
    or new.client_id is distinct from old.client_id or new.provider_id is distinct from old.provider_id
    or new.created_at is distinct from old.created_at or new.moderated_at is distinct from old.moderated_at then
    raise exception using message = 'REVIEW_IDENTITY_IMMUTABLE';
  end if;
  return new;
end $$;
drop trigger if exists protect_review_identity on public.reviews;
create trigger protect_review_identity before update on public.reviews
for each row execute function public.protect_review_identity();
