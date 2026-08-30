# Base de datos

La migración inicial está en `supabase/migrations/202608290001_foundation.sql`; los catálogos, quince rangos y configuración mock están en `supabase/seed.sql`. Se usan UUID, claves foráneas, checks, unicidad e índices implícitos de claves. `npx supabase db reset` reconstruye el entorno local de forma reproducible.
