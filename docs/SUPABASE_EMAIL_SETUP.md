# Configuración de emails Supabase

Estas instrucciones se ejecutan recién cuando exista dominio definitivo y SMTP verificado. Los templates ya están versionados; no contienen dominio viejo ni URLs hardcodeadas.

## 1. URL Configuration

En Supabase Dashboard del proyecto correcto:

1. Abrir **Authentication → URL Configuration**.
2. En **Site URL**, ingresar `https://DOMINIO-FUTURO` reemplazándolo por el dominio real. No incluir query, hash ni credenciales.
3. En **Redirect URLs**, registrar de forma exacta:
   - `https://DOMINIO-FUTURO`
   - `https://DOMINIO-FUTURO/recover-password` si el hosting conserva esa ruta web
   - `laburapp://auth/callback`
   - `laburapp://recover-password`
4. No usar comodines en producción. Conservar localhost únicamente en el proyecto local/staging que lo necesite.
5. Configurar en web/mobile la única variable `EXPO_PUBLIC_APP_URL=https://DOMINIO-FUTURO`.

`supabase/config.toml` es configuración local: no reemplaza los valores del Dashboard hospedado.

## 2. Plantillas

Ir a **Authentication → Email Templates**. Para cada plantilla, copiar el HTML completo del archivo indicado y usar el asunto exacto de la tabla.

| Template del Dashboard | Asunto | Archivo | Variables usadas |
|---|---|---|---|
| Confirm signup | `Confirmá tu cuenta de LaburApp` | `supabase/templates/confirmation.html` | `{{ .Data.full_name }}`, `{{ .ConfirmationURL }}` |
| Reset password | `Recuperá tu contraseña de LaburApp` | `supabase/templates/recovery.html` | `{{ .Email }}`, `{{ .ConfirmationURL }}` |
| Change email address | `Confirmá tu nuevo correo de LaburApp` | `supabase/templates/email-change.html` | `{{ .NewEmail }}`, `{{ .ConfirmationURL }}` |
| Password changed notification | `Tu contraseña de LaburApp fue actualizada` | `supabase/templates/password-changed.html` | `{{ .Email }}` |

No reemplazar `{{ .ConfirmationURL }}` por una URL propia: Supabase genera el enlace firmado y respeta la redirect allowlist. Los cuatro archivos usan tablas y estilos inline, sin imágenes remotas, y tienen ancho máximo 560 px para clientes móviles.

## 3. Opciones Auth

En **Authentication → Providers → Email**:

1. Mantener confirmación de email activa para signup público.
2. Activar **Secure email change** si el producto habilita cambio de email.
3. Verificar que la notificación de cambio de contraseña esté activa.
4. Revisar expiración de JWT, protección de reuse de refresh token y rate limits.
5. Antes de apertura pública, decidir/configurar CAPTCHA y probar respuestas 429.

## 4. SMTP (pendiente)

En **Project Settings → Authentication → SMTP Settings** (la etiqueta puede mostrarse también dentro de Authentication Settings):

1. Usar un proveedor SMTP del dominio real.
2. Definir remitente y nombre visibles de LaburApp.
3. Cargar host, puerto, usuario y contraseña sólo en Dashboard; no versionarlos ni usar variables `EXPO_PUBLIC_*`.
4. Verificar SPF, DKIM y DMARC en DNS.
5. Enviar pruebas a Gmail, Outlook y un cliente móvil antes de habilitar tráfico real.

## 5. Prueba de aceptación

En staging, ejecutar con cuentas descartables:

- signup → recibe confirmación → enlace abre el dominio/app correcto → login funciona;
- recuperación web y Android → enlace sólo vuelve al dominio configurado o a `laburapp://recover-password`;
- cambio de email → mensaje muestra `NewEmail` y requiere confirmación;
- cambio de contraseña → llega notificación sin enlace sensible;
- redirect externo no allowlisteado es rechazado;
- logout invalida la sesión local y refresh persiste correctamente tras reinicio.

Registrar fecha, plataforma, destinatario y resultado. No copiar tokens completos en tickets o capturas.

