# Dominio, enlaces y acceso social

LaburApp todavía no tiene un dominio público definitivo. Ningún host debe tratarse como canónico hasta que el equipo lo controle y lo configure explícitamente.

## DNS y hosting

El dominio y el hosting público están pendientes. No se debe configurar DNS ni declarar un host canónico hasta confirmar que el dominio fue comprado y está bajo control de LaburApp.

## Google

En Google Cloud se debe configurar:

- dominio autorizado: pendiente;
- origen web: el valor HTTPS definitivo de `EXPO_PUBLIC_APP_URL`;
- URL de retorno de Supabase: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`;
- página principal, privacidad y términos servidos por HTTPS en el dominio.

## Apple

En Apple Developer se debe crear un Services ID para acceso web y asociarlo al App ID `com.alsema.laburapp`. El dominio web se completará cuando exista; la URL de retorno será la indicada por Supabase. Los enlaces universales requieren publicar `/.well-known/apple-app-site-association` con el Team ID real.

## Archivos pendientes de identidad

No se publican archivos `.well-known` con identificadores inventados. Para generarlos correctamente hacen falta:

- Apple Team ID;
- Android SHA-256 del certificado de firma;
- referencia y URL final del proyecto Supabase;
- identificadores OAuth de Google y Apple.
