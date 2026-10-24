# Acceso anticipado: mensaje privado → planilla

La regla de Meta se activa con el comentario `LABURO` y pide un Gmail por
Messenger o Instagram. El flujo deseado **no** dirige a un formulario web:
`/api/meta-messages` debe recibir el mensaje privado firmado por Meta, extraer
un único Gmail, guardar la solicitud en `early_access_requests` (Supabase) y
enviar el correo mediante Resend. El proyecto de Apps Script vinculado a la
planilla consulta `/api/early-access-feed` cada cinco minutos y agrega sólo
Gmail nuevos a la pestaña `Seguimiento`.

Estado al 24/10/2026: Meta aprobó la verificación del negocio, pero la app
`LaburApp Mensajes` sigue sin publicar y su revisión de permisos de mensajería
no está completa. El webhook está implementado y probado localmente; **no** se
ha confirmado la recepción real de un DM ni el correo automático desde Meta.
No activar anuncios ni prometer acceso automático hasta probar el recorrido
completo con una cuenta de prueba y constatar el Gmail en la planilla.

- Planilla: `1f49Dtq82hUBdroy3TqMfwcMxmpSG9nU1r8mxomViMmM`
- Apps Script: `1lqyu5nvEbN2zmQ3fOZ4POrmIddiOtnrSzGPQFwSWIfkqNzuGKoXLrriL`
- Función periódica: `syncEarlyAccess`; instalador idempotente: `installEarlyAccessSync`
- Secreto: `EARLY_ACCESS_SYNC_SECRET` en Vercel Production y en las propiedades
  privadas del proyecto de Apps Script. Nunca incluir su valor en el código.

La columna `Alta en Google Play` queda `Pendiente` hasta confirmar el Gmail en
la pista de prueba. La planilla no concede acceso por sí sola. La API pública
de Google Play no admite administrar la lista de correos individuales de
testers; sólo grupos de Google. No informar que una persona puede instalar la
app mientras no figure habilitada en Play Console.

Prueba del 23/10/2026: `smalbonio@gmail.com` se guardó en Supabase, el mensaje
llegó a Gmail y apareció automáticamente en `Seguimiento!A27:J27` con estado
`Pendiente`.
