# Google Play Data Safety — borrador técnico

Fecha: 2026-09-26. No es una declaración legal ni fue enviado a Google Play. Debe reconciliarse con política de privacidad, soporte, retenciones reales y cualquier SDK agregado antes de publicar.

| Categoría Play | Datos técnicos | Recolectado | Compartido | Finalidad | Requerido/opcional | Eliminación |
|---|---|---|---|---|---|---|
| Información personal | email, nombre, ID público, ciudad | sí | no, salvo proveedores encargados de infraestructura | cuenta, autenticación, operación | requerido para cuenta; ciudad según uso | flujo in-app implementado |
| Fotos y videos | avatar, portfolio, problema, credencial, comprobante | sí | Drive sólo como copia operativa configurada por LaburApp | perfil, solicitud, verificación | opcional salvo comprobante/credencial en su flujo | Storage directo; Drive en cola |
| Mensajes | chat y texto de solicitudes/presupuestos | sí | no | funcionalidad de la app | requerido al usar la función | mensajes eliminados en cuenta afectada/retención |
| Actividad en la app | solicitudes, cotizaciones, jobs, reseñas, estados | sí | no | servicio, seguridad, soporte | requerido al contratar/prestar | anonimización/retención estructural |
| Información financiera | importe/plan/estado y comprobante de transferencia | sí | no; procesamiento manual propio | suscripción y trazabilidad | requerido sólo para Premium | archivo eliminado; registro mínimo retenido |
| Archivos/documentos | credenciales profesionales y OCR temporal | sí | no | verificación del prestador | opcional según certificación | eliminación de cuenta y purga programada |
| IDs de dispositivo | push token cuando se habilite | sí | proveedor push al activarse | notificaciones | opcional | eliminado con la cuenta |
| Diagnóstico | errores sanitizados del hosting/runtime | puede existir | proveedor de hosting | seguridad y estabilidad | automático | según retención del proveedor |
| Ubicación | no se solicita GPS; sólo ciudad/zona escrita | no precisa | no | cobertura aproximada | opcional | anonimizada/eliminada |

## Propiedades técnicas

- Cifrado en tránsito: endpoints HTTPS de Supabase/EAS/Google; no se autoriza tráfico HTTP en Preview/Release.
- Cifrado local de sesión: contenido cifrado; clave en SecureStore/Android Keystore, separada del ciphertext.
- Backups Android: deshabilitados; reglas Android 11 y 12+ excluyen DB/AsyncStorage y SecureStore.
- Creación de cuenta: sí.
- Eliminación in-app: sí, con reautenticación y confirmación explícita.
- URL web de eliminación: ruta implementada; URL final `DOMAIN BLOCKED`.
- Publicidad, tracking y venta de datos: no hay SDK ni función implementada. Volver a auditar antes de contestar la consola.
- Datos compartidos: confirmar la interpretación jurídica de Supabase, Google Drive, EAS/Vercel y correo como proveedores de servicio antes de marcar respuestas finales.

## Campos que requieren decisión humana/legal

- plazos exactos para registros contractuales, financieros, antifraude y logs;
- texto y URL final de política de privacidad;
- contacto de soporte y responsable de datos;
- si alguna transferencia a proveedor se declara como “compartida” bajo la definición vigente de Google;
- ads declaration, app access y content rating en Play Console.
