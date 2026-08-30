# Despliegue

El panel compila con `npm run build` y puede desplegarse en un proveedor compatible con Next.js. Para móvil, `apps/mobile/eas.json` define development, preview APK y production. Supabase debe migrarse primero en un proyecto separado por ambiente; nunca se copian claves service-role a frontends.
