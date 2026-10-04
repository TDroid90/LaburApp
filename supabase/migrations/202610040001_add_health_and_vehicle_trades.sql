insert into public.professional_trades(name, position, active) values
  ('Kinesiólogo/a', 32, true),
  ('Osteópata', 33, true)
on conflict(name) do update set active = true;

insert into public.categories(name, requires_credential, active) values
  ('Kinesiología', true, true),
  ('Osteopatía', true, true)
on conflict(name) do update
set requires_credential = excluded.requires_credential,
    active = true;
