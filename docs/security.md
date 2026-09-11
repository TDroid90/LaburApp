# Seguridad

Todas las tablas expuestas tienen RLS activada. No existe una política de escritura abierta para roles, auditoría, pagos ni contadores. `has_role` es una función con `security definer`, búsqueda fijada y ejecución limitada a usuarios autenticados. La service role nunca debe llegar al navegador o a la aplicación móvil.

Los comprobantes de certificaciones se guardan en el bucket privado `provider-credentials`, separado de avatar y portfolio. Sólo el titular, moderación y administración pueden leerlos. Se admite un único archivo JPG optimizado por certificación; un documento doble faz debe cargarse como una sola imagen compuesta. El original se conserva como máximo cinco días y, una vez revisado, se elimina dentro de las 48 horas. El texto temporal generado por OCR también se elimina dentro de las 48 horas.

La identidad se vuelve a verificar cada 12 meses. Las certificaciones sin vencimiento explícito se consideran válidas por un máximo de 36 meses; si el documento declara una fecha anterior, prevalece esa fecha. Toda aprobación o rechazo usa una función administrativa protegida y genera un evento de auditoría.

Las contraseñas pertenecen exclusivamente a Supabase Auth. Nunca se copian a Google Sheets, Drive, logs ni tablas públicas; Base64 tampoco se usa porque es reversible. La pestaña `Usuarios` sólo recibe identidad operativa, rol, estado y el indicador de que la contraseña es no exportable. El alta exige una contraseña de al menos 12 caracteres con mayúscula, minúscula, número y símbolo; la recuperación utiliza un enlace de un solo uso.

La sesión guardada en el dispositivo no habilita funciones por sí sola: al abrir la app se vuelve a validar contra Supabase y los permisos efectivos dependen de RLS. La vista de administrador como cliente o prestador modifica únicamente la interfaz y conserva el rol real para todas las comprobaciones del servidor.

La detección de contacto se aplica tanto en la interfaz como en la base. No se deben registrar chats completos, direcciones, documentos, tokens ni medios de pago en analytics. La clave `SUPABASE_SERVICE_ROLE_KEY` y el secreto de tareas programadas son exclusivamente de servidor. El OCR administrativo se ejecuta localmente en el navegador mediante WebAssembly: no envía la imagen a un servicio de IA externo.
