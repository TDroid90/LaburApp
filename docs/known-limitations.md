# Limitaciones conocidas de 0.9

Ya funcionan con Supabase: registro e ingreso, recuperación de contraseña, roles, perfiles, solicitudes, fotos privadas de solicitudes, presupuestos modulares y revisiones, chat en tiempo real con bloqueo de contacto/precios, cancelación, aceptación, QR de finalización, reseñas verificadas y comprobantes privados de certificaciones. Google Sheets actúa como espejo operativo y no como fuente de verdad.

Antes de considerar 1.0 siguen pendientes: proveedor de pagos y reintegros reales, notificaciones push, sanciones automatizadas, borrado de cuenta desde la app, pruebas físicas iOS/Android y publicación EAS. La revisión documental ya cuenta con cola real, OCR local, consulta de padrones y auditoría, pero la aprobación final sigue siendo humana. Camuzzi requiere consulta manual porque no expone una API pública estable.

Pagos, anuncios y SMS permanecen desactivados. La versión 0.9 puede usarse como beta controlada, pero no debe anunciar “pago protegido” como transacción real hasta integrar y auditar al proveedor de cobros.
