# Seguridad

Todas las tablas expuestas tienen RLS activada. No existe una política de escritura abierta para roles, auditoría, pagos ni contadores. `has_role` es una función con `security definer`, búsqueda fijada y ejecución limitada a usuarios autenticados. La service role nunca debe llegar al navegador o a la aplicación móvil.

Los comprobantes de certificaciones se guardan en el bucket privado `provider-credentials`, separado de avatar y portfolio. Sólo el titular, moderación y administración pueden leerlos. Las imágenes se reducen antes de subir, se revisan con un objetivo operativo de 24 horas y se programan para eliminación 24 horas después de aprobarse o rechazarse. La verificación vence a los seis meses y exige una nueva carga.

Las contraseñas pertenecen exclusivamente a Supabase Auth. Nunca se copian a Google Sheets, Drive, logs ni tablas públicas; Base64 tampoco se usa porque es reversible. La pestaña `Usuarios` sólo recibe identidad operativa, rol, estado y el indicador de que la contraseña es no exportable. El alta exige una contraseña de al menos 12 caracteres con mayúscula, minúscula, número y símbolo; la recuperación utiliza un enlace de un solo uso.

La sesión guardada en el dispositivo no habilita funciones por sí sola: al abrir la app se vuelve a validar contra Supabase y los permisos efectivos dependen de RLS. La vista de administrador como cliente o prestador modifica únicamente la interfaz y conserva el rol real para todas las comprobaciones del servidor.

La detección de contacto se aplica tanto en la interfaz como en la base. No se deben registrar chats completos, direcciones, documentos, tokens ni medios de pago en analytics. La clave `SUPABASE_SERVICE_ROLE_KEY` y el secreto de tareas programadas son exclusivamente de servidor.
