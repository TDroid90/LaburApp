# Despliegue

La aplicación web se exporta con `npm run build:web` y se publica desde la raíz usando `vercel.json`. El proyecto productivo de Vercel es `laburapp` y está conectado al repositorio de GitHub.

El panel administrativo compila con `npm run build` y debe desplegarse como proyecto separado, con sus variables de acceso. Para móvil, `apps/mobile/eas.json` define development, preview APK y production. Supabase debe migrarse primero en un proyecto separado por ambiente; nunca se copian claves service-role a frontends.

La configuración de dominio y acceso social está detallada en `docs/domain-and-auth.md`.
