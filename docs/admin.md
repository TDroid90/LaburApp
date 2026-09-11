# Administración

El panel integrado sólo se habilita cuando Supabase confirma el rol `admin`; ocultar enlaces en el cliente no se considera autorización. La cola de certificaciones obtiene los registros reales protegidos por RLS, muestra cada comprobante mediante una URL privada de diez minutos y permite transcribir, aprobar u observar. La decisión se ejecuta mediante `admin_review_credential` y queda en auditoría.

La lectura OCR se realiza localmente en el navegador administrativo. Sus resultados son editables porque una lectura automática nunca reemplaza la revisión humana. El panel consulta por apellido, DNI o matrícula los padrones públicos de la DPE y la Cooperativa Eléctrica de Río Grande. Camuzzi se abre como consulta manual asistida porque su buscador no ofrece una API pública estable. Una coincidencia nunca aprueba por sí sola una certificación.

Los indicadores del panel se calculan desde la cola real: pendientes, casos fuera del plazo de cinco días, archivos todavía disponibles y fuentes oficiales habilitadas.
