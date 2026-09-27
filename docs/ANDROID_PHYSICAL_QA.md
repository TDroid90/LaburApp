# QA físico Android — Release Candidate

Build: completar ID/URL del APK de Preview al finalizar EAS. Dispositivos mínimos: uno con gestos/notch y otro con tres botones; registrar fabricante, modelo y Android. Para cada fila marcar exactamente `PASS`, `FAIL` o `NOT TESTED` y agregar evidencia si falla.

| Área | Caso ejecutable | Estado | Evidencia/notas |
|---|---|---|---|
| INSTALL | instalar APK Preview limpio y confirmar package `com.alsema.laburapp` | NOT TESTED | |
| FIRST LAUNCH | abrir sin cuenta; sin pantalla roja, overlay ni contenido demo | NOT TESTED | |
| SIGNUP | registrar email nuevo, validar mensajes y estado pendiente de email | NOT TESTED | |
| EMAIL STATE | abrir confirmación/recovery cuando haya SMTP y dominio | NOT TESTED | DOMAIN BLOCKED |
| LOGIN | ingresar con cuenta confirmada; Enter ejecuta Ingresar | NOT TESTED | |
| LOGOUT | cerrar sesión y comprobar que no vuelve al reabrir | NOT TESTED | |
| SESSION RESTORE | cerrar/abrir y conservar sesión/pestaña | NOT TESTED | |
| CLIENT PROFILE | foto, nombre, ciudad e ID | NOT TESTED | |
| PROVIDER PROFILE | publicar/editar y revisar límites Gratis/Premium | NOT TESTED | |
| PORTFOLIO | crear, editar y borrar fotos/trabajos | NOT TESTED | |
| REQUEST | crear solicitud con zona/horario | NOT TESTED | |
| REQUEST PHOTO | galería, cancelar selector y foto grande/rotada | NOT TESTED | |
| QUOTE | enviar, revisar y aceptar presupuesto | NOT TESTED | |
| ACCEPTANCE | doble toque no duplica job | NOT TESTED | |
| CHAT | mensajes entre dos dispositivos, expiración y sin contacto/precio | NOT TESTED | |
| REALTIME | cambios aparecen sin refrescar; fallback tras reconectar | NOT TESTED | |
| QR | escaneo válido completa exactamente una vez | NOT TESTED | |
| CAMERA | permitir, denegar y bloqueo permanente | NOT TESTED | |
| IMAGE PICKER | galería/Google Photos, retorno y cancelación | NOT TESTED | |
| OFFLINE | lectura/mutación sin red no informa éxito falso | NOT TESTED | |
| RECONNECT | reconectar y recuperar Realtime/datos sin duplicados | NOT TESTED | |
| BACKGROUND | enviar app al fondo en formularios/QR y volver | NOT TESTED | |
| FOREGROUND | datos y estado se actualizan al volver | NOT TESTED | |
| FORCE CLOSE | forzar cierre y reabrir en pantalla previa segura | NOT TESTED | |
| REOPEN | repetir apertura 5 veces sin reset inesperado | NOT TESTED | |
| ROTATION | portrait/landscape en auth, perfil, modal y QR | NOT TESTED | |
| ANDROID BACK | cierra teclado/modal antes de salir | NOT TESTED | |
| KEYBOARD | inputs visibles; tap exterior cierra teclado | NOT TESTED | |
| FONT 130% | sin texto cortado ni botones inaccesibles | NOT TESTED | |
| FONT 160% | scroll y acciones continúan accesibles | NOT TESTED | |
| FONT 200% | no hay acción crítica fuera de pantalla | NOT TESTED | |
| PERMISSION DENIED | cámara/galería explican alternativa | NOT TESTED | |
| PERMISSION BLOCKED | abrir Ajustes, volver y reintentar | NOT TESTED | |
| ACCOUNT DELETION | reauth, `ELIMINAR`, logout y acceso posterior rechazado | NOT TESTED | |

## QR físico

| Caso | Estado | Resultado esperado |
|---|---|---|
| QR válido | NOT TESTED | backend completa el job |
| doble scan/doble tap | NOT TESTED | una confirmación; segunda rechazada |
| QR de otro usuario | NOT TESTED | rechazo sin filtrar datos |
| expirado | NOT TESTED | rechazo controlado |
| ya usado | NOT TESTED | rechazo por replay |
| cámara denegada | NOT TESTED | explicación y código manual |
| volver desde Ajustes | NOT TESTED | permiso se recalcula |
| background durante scanner | NOT TESTED | lock se conserva/reinicia con seguridad |

## Cámara e imágenes

Probar `allow`, `deny`, “no volver a preguntar”, galería, cancelar, foto grande, portrait, landscape, archivo corrupto cuando el proveedor lo permita y background/resume. La imagen debe validarse/reducirse; nunca se muestra “guardado” si el upload falló.

## Offline

Con Wi-Fi y datos móviles apagados, luego modo avión: probar lecturas, alta de solicitud, chat, comprobante y perfil. Al reconectar, verificar Realtime, relectura, ausencia de duplicados y mensajes de error honestos.
