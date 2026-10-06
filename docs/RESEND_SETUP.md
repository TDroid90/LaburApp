# Configuración de correo de LaburApp

## Estado del dominio

`laburapp.work` quedó verificado en Resend. En Namecheap se agregaron el TXT DKIM, los CNAME `rsend` y `send`, y el TXT DMARC opcional (`v=DMARC1; p=none;`). Se conservó el SPF que Namecheap mantiene bloqueado para Email Forwarding. Resend muestra DKIM y ambos CNAME verificados, con el envío habilitado.

## Variables de Vercel

En el entorno Production cargar:

- `RESEND_API_KEY`: clave secreta creada en Resend y restringida al envío de LaburApp.
- `MAIL_NOREPLY=LaburApp <no-reply@laburapp.work>`
- `MAIL_SUPPORT=LaburApp Soporte <soporte@laburapp.work>`
- `MAIL_CONTACT=LaburApp <contacto@laburapp.work>`
- `MAIL_INFO=LaburApp <info@laburapp.work>`
- `SEND_EMAIL_HOOK_SECRET`: secreto firmado del Send Email Hook de Supabase (mismo valor en Supabase y Vercel).

Conservar también las variables server-side ya usadas por la API: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (o `SUPABASE_PUBLISHABLE_KEY`) y `SUPABASE_SERVICE_ROLE_KEY` (o el nombre legacy `SUPABASE_SECRET_KEY`). No exponer ninguna de estas claves con prefijo `EXPO_PUBLIC_`.

## Activación de correos de autenticación

Después del deploy de Vercel, configurar en Supabase Auth → Hooks → Send Email Hook la URL `https://laburapp.work/api/mail` y el secreto de firma indicado arriba. La clave de Resend se guarda solamente en Vercel. Al habilitar este hook, Supabase delega el envío de sus correos de autenticación al endpoint.

En Resend mantener desactivado el tracking de enlaces para los correos de autenticación: reescribir el enlace puede invalidar el flujo de confirmación o recuperación.

## Alcance actual

Implementado: confirmación de registro, recuperación, enlace de acceso/invitación y confirmación de cambio de correo por Auth Hook; recibo de comprobante y aviso de activación Premium desde la app. La transferencia y su aprobación humana permanecen sin cambios.

No hay actualmente un formulario de contacto/soporte que envíe mensajes, ni una acción de rechazo de comprobantes de suscripción en la app; por eso esos remitentes/eventos quedan configurados como remitentes disponibles, pero no se inventó un flujo nuevo.
