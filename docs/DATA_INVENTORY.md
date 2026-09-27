# Inventario de datos de LaburApp

Fecha: 2026-09-24. Este inventario describe el código y las migraciones locales. No confirma configuración manual de Supabase Hosted, Drive ni proveedores externos.

| Categoría | Datos | Finalidad técnica | Almacenamiento | Exposición | Borrado/retención actual |
|---|---|---|---|---|---|
| Cuenta y sesión | email, nombre, rol, identificador público, tokens de sesión | acceso, autorización y recuperación | Supabase Auth; sesión móvil cifrada con clave en SecureStore/Keystore y ciphertext en AsyncStorage | privada; nombre/ID sólo donde el producto los muestra | logout elimina sesión local; no existe eliminación integral de cuenta |
| Perfil cliente | nombre, ciudad, avatar | identidad dentro de solicitudes y cuenta | `profiles`, bucket de avatares | datos mínimos según RLS/RPC; avatar público según URL almacenada | edición disponible; borrado integral no implementado |
| Perfil profesional | oficio, biografía, zonas, disponibilidad, servicios, tarifas | publicar y contratar servicios | tablas de perfil/ofertas/tarifas | una vista pública minimizada; campos internos protegidos | edición/despublicación parcial; borrado integral no implementado |
| Imágenes | avatar, portfolio, fotos de solicitud | presentación y contexto del trabajo | buckets de Supabase; copia operativa a Drive cuando corresponde | portfolio/avatar pueden ser públicos; solicitud privada a participantes | reglas de retención parciales; no hay flujo único de borrado de cuenta |
| Solicitudes y presupuestos | descripción, zona, fecha, estado, importes, ítems | coordinar contratación | `service_requests`, `quotes`, adjuntos | cliente/prestador participantes y administración según RLS | ciclo de estados/cancelación; conservación final por definir |
| Trabajos y QR | job, token de finalización hash/estado, comprobante | confirmar finalización | DB y bucket privado de comprobantes | participantes autorizados; el QR no contiene PII/precio | token vence y es de un uso; comprobantes sujetos a política pendiente |
| Reseñas | puntaje, comentario, cualidades, apelación | reputación y moderación | `reviews`, `reports` | publicación minimizada; moderación privada | edición durante ventana funcional; conservación tras cuenta pendiente de decisión |
| Mensajes | texto, remitente, timestamps | conversación del trabajo | `messages` | sólo participantes y administración autorizada | expiración definida en el flujo; purga operativa depende de cron de servidor |
| Credenciales profesionales | imagen, tipo, matrícula, OCR, estado, vencimiento | verificación profesional | bucket privado `provider-credentials`, tabla `credentials` | titular y administración | original máximo 5 días/revisión; OCR 48 h; ejecución efectiva depende de cron de retención |
| Suscripciones/comprobantes | plan, importe, imagen, estado | verificación manual por transferencia | `subscription_requests`, bucket privado y outbox Drive | usuario y administración | política de conservación y borrado de cuenta pendiente |
| Drive/outboxes | rutas, IDs de entidad, estado de sincronización | copia operativa controlada | tablas outbox y Google Drive | servidor/administración | worker y retención requieren configuración externa |
| Logs técnicos | errores sanitizados y estados de operación | diagnóstico y resiliencia | runtime/plataforma; no se agregó tracking | operadores del entorno | política externa del hosting; el cliente no registra tokens, contraseñas, QR ni documentos |

## Datos locales del dispositivo

- La sesión Supabase se cifra; la clave no se guarda junto al ciphertext.
- AsyncStorage conserva preferencias/estado no secreto y el ciphertext de sesión. Android backup está desactivado y las reglas excluyen datos sensibles en Android 11 y Android 12+.
- Imágenes elegidas pueden existir temporalmente en caché del sistema/Expo hasta que el sistema operativo las purgue.
- La aplicación no incorpora SDK de publicidad, tracking ni analítica en esta fase.

## Permisos

- Cámara: únicamente para leer el QR de finalización.
- Fotos/selector del sistema: perfil, portfolio, solicitudes, credenciales y comprobantes. No se solicita micrófono.
- Internet: autenticación, API, Realtime y archivos.

## Eliminación de cuenta

No existe un flujo completo de eliminación. Antes de publicar en stores hay que definir qué se elimina, anonimiza o conserva por obligación operacional/legal, incluyendo Auth, perfiles, Storage, Drive, mensajes, solicitudes, trabajos, reseñas y outboxes. Implementarlo sin esa decisión podría borrar evidencia o dejar PII huérfana, por eso queda marcado como blocker de store/release.
