# RLS

Un perfil privado pertenece a su usuario. Los prestadores publicados son consultables; solicitudes, trabajos y mensajes se limitan a sus participantes. Credenciales privadas se restringen a dueño, moderación y administración. Los roles privilegiados, eventos, pagos, snapshots, tokens y auditoría no tienen escritura directa desde clientes.

Antes de producción deben agregarse pruebas PostgreSQL con usuarios JWT simulados para cada política y funciones RPC que validen la máquina de estados, reseñas y contabilización idempotente.
