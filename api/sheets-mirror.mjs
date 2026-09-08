const ALLOWED_TABS = new Set([
  "Usuarios",
  "Profesionales",
  "Contactos",
  "Presupuestos",
  "Trabajos",
  "Reseñas",
  "Pagos",
  "Agenda",
  "Auditoría",
  "Tarifario",
  "Plantillas",
  "Membresías",
]);

function respond(res, status, body) {
  res.status(status).json(body);
}

function validEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (typeof value.id !== "string" || value.id.length < 8 || value.id.length > 160) return false;
  if (!ALLOWED_TABS.has(value.tab)) return false;
  if (typeof value.occurredAt !== "string" || Number.isNaN(Date.parse(value.occurredAt))) return false;
  if (!value.payload || typeof value.payload !== "object" || Array.isArray(value.payload)) return false;
  return JSON.stringify(value.payload).length <= 25_000;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return respond(res, 405, { error: "Método no permitido." });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookUrl = process.env.SHEETS_WEBHOOK_URL;
  const webhookSecret = process.env.SHEETS_WEBHOOK_SECRET;
  if (!supabaseUrl || !serviceKey || !webhookUrl || !webhookSecret) {
    return respond(res, 503, { error: "El espejo de Google Sheets todavía no está configurado." });
  }

  const authorization = req.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) return respond(res, 401, { error: "Sesión requerida." });

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, authorization },
  });
  if (!userResponse.ok) return respond(res, 401, { error: "Sesión inválida." });

  const event = req.body;
  if (!validEvent(event)) return respond(res, 400, { error: "Evento inválido." });

  const user = await userResponse.json();
  const upstream = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({
      secret: webhookSecret,
      event: { ...event, actorUserId: user.id },
    }),
  });
  const text = await upstream.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    return respond(res, 502, { error: "Google Sheets devolvió una respuesta inválida." });
  }
  if (!upstream.ok || result?.ok !== true) {
    return respond(res, 502, { error: "Google Sheets rechazó la sincronización." });
  }
  return respond(res, 200, { ok: true, eventId: event.id, duplicate: result.duplicate === true });
}
