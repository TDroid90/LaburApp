# Espejo operativo en Google Sheets

La hoja es un espejo operativo para seguimiento comercial; Supabase sigue siendo la fuente de verdad y el lugar correcto para restaurar datos. Google Sheets no reemplaza los backups de base de datos.

## Pestañas

- `Usuarios`: fecha, identificador, nombre, correo, rol, ciudad, estado y origen.
- `Profesionales`: oficio, ciudad, reputación, trabajos, verificación y disponibilidad.
- `Contactos`: solicitud, cliente, profesional, oficio, canal, estado y descripción del pedido. Los mensajes privados no se copian.
- `Presupuestos`: versión, modalidad, total, alcance, plazo, vigencia, observaciones y detalle de ítems.
- `Trabajos`, `Reseñas`, `Pagos`, `Agenda` y `Auditoría`: estructura preparada para los módulos productivos y sus controles operativos.

Nunca se reflejan contraseñas, tokens, documentos privados, direcciones exactas, medios de pago ni el texto completo del chat.

## Conexión

1. Abrir la hoja objetivo y crear un Apps Script vinculado.
2. Usar `integrations/google-sheets/Code.gs` y ejecutar una vez `setupLaburAppMirror` para crear/formatear las pestañas.
3. Guardar `WEBHOOK_SECRET` en las propiedades del script y desplegarlo como aplicación web.
4. Configurar `SHEETS_WEBHOOK_URL` y `SHEETS_WEBHOOK_SECRET` como secretos de Supabase.
5. Desplegar la función `sheets-mirror`.

La app guarda temporalmente eventos pendientes si Supabase todavía no está conectado y los reintenta al habilitarse. La migración agrega también una outbox privada para que la sincronización productiva pueda reintentarse sin perder eventos.
