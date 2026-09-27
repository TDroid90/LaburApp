# Eliminación de cuenta

Estado: implementado y validado en staging el 2026-09-26. La URL pública exigida por Google Play queda `DOMAIN BLOCKED`; no se inventó un host.

## Flujo y autoridad

1. La persona abre **Perfil → Eliminar cuenta**, lee las consecuencias, ingresa su contraseña actual y escribe `ELIMINAR`.
2. `delete-account` identifica al usuario exclusivamente desde el JWT. El cuerpo no acepta ni utiliza un `user_id`.
3. La función vuelve a autenticar el email del JWT con la contraseña recibida. La contraseña vive sólo durante la petición; no se registra ni persiste.
4. Se eliminan los objetos de Storage bajo el prefijo del UUID. Un fallo detiene el proceso y permite reintentar.
5. El RPC exclusivo de `service_role` toma un advisory lock, pone en cola la limpieza de Drive y ejecuta la política transaccional de DB.
6. Auth se elimina al final. Sólo tras esa confirmación la app limpia la sesión/estado local y muestra éxito.

La operación es idempotente: una repetición reutiliza la misma solicitud, `ON CONFLICT` evita duplicar limpieza de Drive y las eliminaciones/anonomizaciones se pueden volver a ejecutar. Si Auth falla después de preparar DB, la persona aún puede reautenticarse y reintentar; su perfil ya queda inactivo y sin roles.

## Inventario y decisión

| Entidad | Acción | Motivo |
|---|---|---|
| `auth.users` y sesiones | DELETE al final | revocar identidad y futuros accesos |
| sesión cifrada, estado local, última pestaña, novedades vistas | DELETE | datos del dispositivo ligados a la cuenta |
| `profiles` | ANONYMIZE/RETAIN | tombstone sin PII para FKs históricas |
| roles, membresías cliente/prestador, push, notificaciones | DELETE | autorización y estado operativo ya innecesarios |
| perfil profesional, servicios, tarifas, disponibilidad, trabajos/portfolio | DELETE | contenido público y comercial del titular |
| credenciales, OCR, documentos privados | DELETE | información profesional sensible |
| avatares, portfolio, fotos de solicitud, credenciales y recibos en Storage | DELETE | archivos personales bajo el UUID |
| outboxes Drive del usuario | DELETE luego de encolar cleanup | no conservar rutas operativas; cleanup reintentable |
| archivos Drive conocidos | DELETE diferido | `drive_cleanup_outbox`; requiere worker/credencial staging |
| solicitudes del cliente | ANONYMIZE/RETAIN | integridad del trabajo de la contraparte; se elimina texto/zona/horarios |
| solicitudes donde era prestador | RETAIN | el contenido fue creado por el cliente |
| presupuestos emitidos por el prestador eliminado | ANONYMIZE/RETAIN | estructura contractual sin texto libre |
| jobs, pagos, fee snapshots, refunds | RETAIN | trazabilidad contractual/financiera sin perfil identificatorio |
| disputas relacionadas | ANONYMIZE/RETAIN | evidencia estructural antifraude/financiera |
| reseñas relacionadas | ANONYMIZE/RETAIN | rating estructural; comentario/cualidades se eliminan |
| mensajes de conversaciones afectadas | DELETE | contenido efímero y potencialmente sensible |
| comprobantes y confirmaciones | ANONYMIZE/RETAIN | estructura del evento; archivo y ruta se eliminan |
| suscripciones | ANONYMIZE/RETAIN | plan/importe/estado financiero; comprobante se elimina |
| reportes y auditoría | ANONYMIZE/RETAIN | control antifraude; payloads, motivo y detalle personal se eliminan |
| `sheet_mirror_outbox` con UUID | DELETE | copias pendientes con posible PII |

## Fallos parciales

- Storage falla: no se prepara DB ni se elimina Auth; respuesta reintentable.
- DB falla: la transacción revierte; Auth permanece.
- Drive no está disponible: la eliminación continúa y queda una tarea durable; Drive no bloquea el derecho de eliminación.
- Auth falla: solicitud marcada `failed`, perfil sin permisos y reintento posible.
- Timeout de cliente: el cliente no anuncia éxito; puede reintentar. El advisory lock y fingerprints impiden duplicados.

## Verificación

- pgTAP: acceso anónimo/autenticado denegado al RPC, self-delete vía backend, doble submit, anonimización, roles, Premium, outbox, Auth/tombstone y cuenta ajena.
- Staging real: contraseña incorrecta rechazada, campo `user_id` ajeno ignorado, cuenta propia eliminada, cuenta B intacta, Storage vacío y perfil tombstone.
- Pendiente físico: ejecutar el flujo desde APK con pérdida de red y cierre/reapertura.
