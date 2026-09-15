-- El plan gratuito sigue limitado a 3 cualidades desde la interfaz;
-- las cuentas Plus pueden publicar hasta 6.
alter table public.reviews drop constraint if exists reviews_qualities_limit;
alter table public.reviews
  add constraint reviews_qualities_limit check (cardinality(qualities) <= 6);
