-- Bind a new review to the exact provider on the verified job. The previous
-- unqualified reference could resolve both sides to jobs.provider_id.
drop policy if exists "cliente crea resena verificada" on public.reviews;
create policy "cliente crea resena verificada" on public.reviews
for insert to authenticated with check (
  reviews.client_id = auth.uid()
  and cardinality(reviews.qualities) <= case when exists (
    select 1 from public.client_memberships cm
    where cm.client_id = auth.uid() and cm.plan_code = 'plus' and cm.status = 'active'
      and (cm.current_period_ends_at is null or cm.current_period_ends_at > now())
  ) then 6 else 3 end
  and exists (
    select 1 from public.jobs j
    where j.id = reviews.job_id
      and j.client_id = auth.uid()
      and j.provider_id = reviews.provider_id
      and j.completion_verified_at is not null
      and j.status in ('completed', 'funds_released')
  )
);
