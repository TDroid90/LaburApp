# Arquitectura

El repositorio usa npm workspaces. `apps/mobile` contiene Expo Router; `apps/admin`, Next.js App Router; `packages/shared`, las invariantes sin dependencia de interfaz; y `supabase`, el esquema, RLS, almacenamiento y seed.

La interfaz funciona con datos demo si no hay variables. La migración define las entidades centrales de perfiles, catálogo, solicitudes, presupuestos, trabajos, mensajes, pagos mock, comisión, tokens de finalización, reseñas, denuncias, credenciales y auditoría. Los cambios de estado sensibles deben ejecutarse en una función de servidor; nunca se confía en un estado enviado por el cliente.

La comisión se calcula una vez y se guarda en `platform_fee_snapshots`. El rango se deriva de umbrales configurables y no comparte cálculo con las estrellas. La finalización usa únicamente el hash de un token de corta duración y registra su uso.
