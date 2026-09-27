# Supabase Auth — configuración efectiva de staging

Fecha: 2026-09-26. Proyecto: `laburapp-staging` (`sdxvavgmvuyxtklrjxby`). Producción no fue consultada ni modificada.

| Control | ACTUAL staging | RECOMENDADO | CAMBIO REALIZADO |
|---|---|---|---|
| Email/password | habilitado | habilitado | verificado |
| Confirmación de email | habilitada | habilitada | conservada |
| Signup | habilitado | habilitado con confirmación | conservado |
| Anonymous signup | deshabilitado | deshabilitado | verificado |
| Manual account linking | deshabilitado | deshabilitado | verificado |
| Password | mínimo 12; lower/upper/digit/symbol | igual | endurecido desde mínimo 6 |
| Secure password change | habilitado | habilitado | activado |
| Site URL | `http://localhost:8081` | HTTPS staging cuando exista | temporal aplicado; DOMAIN BLOCKED |
| Redirects | localhost/Expo + schemes nativos LaburApp | allowlist HTTPS exacta final | temporal aplicado |
| JWT expiry | 3600 s | ventana acotada | conservado |
| Refresh rotation | habilitada | habilitada | verificado |
| Refresh reuse interval | 10 s | corto, tolerante a concurrencia | verificado |
| Session timebox/inactivity | sin límite adicional | decidir por riesgo/producto | Pro-only; no cambiado |
| Single session | deshabilitada | decisión de producto | Pro-only; no cambiado |
| SMTP | proveedor por defecto | SMTP propio antes de producción | DOMAIN/SMTP BLOCKED |
| CAPTCHA | deshabilitado | evaluar signup/recovery web/native | EXTERNAL CREDENTIAL REQUIRED |
| Leaked-password protection | no disponible | habilitar si el plan lo permite | Pro-only |

## Rate limits observados

| Flujo | Valor efectivo |
|---|---|
| SMS | 30/h; phone provider deshabilitado |
| Refresh token | 150 por 5 min |
| Verificación | 30 por 5 min |
| Signup/signin | 30 por 5 min |
| Anonymous | 30/h; feature deshabilitada |
| Web3 | 30 por 5 min; feature deshabilitada |
| Email | gestionado/bloqueado por proveedor por defecto del plan |

No se aplicaron límites extremos ni se habilitaron proveedores que la app no usa.

## Pruebas reales

- Login válido y lectura protegida: PASS.
- Refresh: PASS.
- Logout global: PASS.
- Refresh anterior e inválido: rechazados.
- `/auth/v1/user` con sesión revocada: rechazado.
- PostgREST con access JWT emitido antes del logout: continúa válido hasta expirar. Riesgo residual máximo actual: 3600 s.
- Usuarios temporales y datos asociados: cleanup PASS.

## Email y templates

Los cuatro templates versionados siguen en el repositorio y no hardcodean dominio. `supabase config push` fue rechazado de forma atómica porque editar templates con el proveedor email por defecto no está disponible en el plan Free; no hubo cambio parcial. La entrega real continúa `DOMAIN/SMTP BLOCKED`.

## CAPTCHA

Clasificación: `EXTERNAL CREDENTIAL REQUIRED`. No se activó un proveedor sin claves ni se arriesgó romper el flujo Expo/native. Al elegir proveedor se deben probar signup, login si aplica, recovery y resend en web y Android.
