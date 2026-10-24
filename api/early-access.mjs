import { MailService } from "./mail-service.mjs";
import { renderMailTemplate } from "./mail-templates.mjs";

export const config = { api: { bodyParser: false } };

const MAX_BODY_BYTES = 8_192;
const PLAY_TEST_URL = "https://play.google.com/apps/testing/com.alsema.laburapp";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.alsema.laburapp";
const PRODUCTION_ORIGINS = new Set([
  "https://laburapp.work",
  "https://www.laburapp.work",
]);

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function allowedOrigin(origin) {
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin);
      return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    } catch {
      return false;
    }
  }
  return false;
}

export function validateEarlyAccess(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (String(payload.company ?? "").trim()) return null;
  const name = String(payload.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(payload.email ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 100) return null;
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/.test(email)) return null;
  return { name, email };
}

async function supabaseRequest(url, serviceKey, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* Keep provider errors private. */ }
  return { ok: response.ok, status: response.status, body };
}

function earlyAccessEmail(name) {
  const title = "Tu acceso anticipado a LaburApp";
  const paragraphs = [
    `Hola ${name}. Recibimos tu solicitud de acceso anticipado.`,
    "Usá el botón para unirte a la prueba oficial de Google Play. Si tu Gmail todavía no está habilitado como tester, guardamos tu solicitud y te avisaremos por este mismo correo cuando puedas instalar la app.",
  ];
  return {
    subject: title,
    html: renderMailTemplate({
      title,
      paragraphs,
      actionLabel: "Descargar LaburApp en Google Play",
      actionUrl: PLAY_TEST_URL,
      footnote: "Google Play debe abrirse con el mismo Gmail que registraste.",
    }),
    text: `${title}\n\n${paragraphs.join("\n\n")}\n\nDescargar LaburApp: ${PLAY_TEST_URL}\n\nAbrí Google Play con el mismo Gmail que enviaste.`,
  };
}

export async function saveEarlyAccessAndEmail(submission, source = "laburapp_web") {
  const normalized = validateEarlyAccess(submission);
  if (!normalized || !["laburapp_web", "meta_messenger", "meta_instagram"].includes(source)) {
    return { status: 400, body: { error: "Solicitud inválida." } };
  }
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) return { status: 503, body: { error: "El acceso anticipado no está disponible en este momento." } };

  try {
    const query = new URLSearchParams({ on_conflict: "email" });
    const stored = await supabaseRequest(`${supabaseUrl}/rest/v1/early_access_requests?${query}`, serviceKey, {
      method: "POST",
      headers: { "content-type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        name: normalized.name,
        email: normalized.email,
        source,
        last_requested_at: new Date().toISOString(),
      }),
    });
    if (!stored.ok || !stored.body?.[0]?.id) {
      console.error("[early-access] storage failed", { status: stored.status });
      return { status: 502, body: { error: "No pudimos guardar tu solicitud. Reintentá en unos minutos." } };
    }

    let emailSent = false;
    try {
      const mailer = new MailService();
      await mailer.send({
        to: normalized.email,
        ...earlyAccessEmail(normalized.name),
        idempotencyKey: `laburapp-early-access-${stored.body[0].id}-${new Date().toISOString().slice(0, 10)}`,
        from: "LaburApp <no-reply@laburapp.work>",
        replyTo: "LaburApp Soporte <soporte@laburapp.work>",
      });
      emailSent = true;
    } catch (error) {
      console.error("[early-access] mail delivery failed", { reason: error instanceof Error ? error.message : "unknown" });
    }

    return { status: 201, body: {
      ok: true,
      emailSent,
      joinUrl: PLAY_TEST_URL,
      storeUrl: PLAY_STORE_URL,
      message: emailSent
        ? "Guardamos tu Gmail y te enviamos los pasos por correo. La instalación requiere que ese Gmail esté habilitado como tester."
        : "Guardamos tu Gmail, pero no pudimos enviarte el correo todavía. Reintentá más tarde o contactanos.",
    } };
  } catch (error) {
    console.error("[early-access] request failed", { reason: error instanceof Error ? error.message : "unknown" });
    return { status: 502, body: { error: "No pudimos procesar la solicitud. Reintentá más tarde." } };
  }
}

export default async function handler(req, res) {
  res.setHeader("Vary", "Origin");
  const origin = String(req.headers.origin ?? "");
  if (!allowedOrigin(origin)) return respond(res, 403, { error: "Origen no permitido." });
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "600");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return respond(res, 405, { error: "Método no permitido." });
  if (!String(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
    return respond(res, 415, { error: "Formato no permitido." });
  }

  let payload;
  try { payload = JSON.parse(await readRawBody(req)); }
  catch (error) {
    return respond(res, error?.message === "REQUEST_TOO_LARGE" ? 413 : 400, { error: "No pudimos leer la solicitud." });
  }
  const submission = validateEarlyAccess(payload);
  if (!submission) return respond(res, 400, { error: "Ingresá tu nombre y un Gmail válido." });
  const result = await saveEarlyAccessAndEmail(submission);
  return respond(res, result.status, result.body);
}
