create or replace function public.enqueue_client_membership_sheet_mirror() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.sheet_mirror_outbox(tab, entity_type, entity_id, operation, payload)
  values('Membresías', 'client_memberships', new.client_id::text, TG_OP, to_jsonb(new));
  return new;
end $$;

drop trigger if exists client_memberships_sheet_mirror on public.client_memberships;
create trigger client_memberships_sheet_mirror
after insert or update on public.client_memberships
for each row execute function public.enqueue_client_membership_sheet_mirror();
