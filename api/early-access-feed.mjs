import crypto from "node:crypto";

const PAGE_SIZE = 250;

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

function equalSecret(received, expected) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return respond(res, 405, { error: "Método no permitido." });

  const expected = process.env.EARLY_ACCESS_SYNC_SECRET || process.env.SHEETS_WEBHOOK_SECRET;
  const supplied = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!equalSecret(supplied, expected)) return respond(res, 401, { error: "No autorizado." });

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) return respond(res, 503, { error: "Origen de datos no configurado." });

  const offset = Number(req.query?.offset ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) {
    return respond(res, 400, { error: "Página inválida." });
  }

  const query = new URLSearchParams({
    select: "id,name,email,source,status,created_at,last_requested_at",
    order: "created_at.asc,id.asc",
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });

  try {
    const upstream = await fetch(`${supabaseUrl}/rest/v1/early_access_requests?${query}`, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (!upstream.ok) {
      console.error("[early-access-feed] Supabase read failed", { status: upstream.status });
      return respond(res, 502, { error: "No se pudieron leer las solicitudes." });
    }
    const requests = await upstream.json();
    if (!Array.isArray(requests)) return respond(res, 502, { error: "Respuesta de datos inválida." });
    return respond(res, 200, {
      requests,
      nextOffset: requests.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
    });
  } catch (error) {
    console.error("[early-access-feed] request failed", { reason: error instanceof Error ? error.message : "unknown" });
    return respond(res, 502, { error: "No se pudieron leer las solicitudes." });
  }
}
