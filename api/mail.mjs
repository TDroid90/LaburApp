import { createHmac } from "node:crypto";
import { authEmailContent, subscriptionActivatedEmail, subscriptionReceivedEmail } from "./mail-templates.mjs";
import { MailService } from "./mail-service.mjs";
import { verifyStandardWebhook } from "./standard-webhook.mjs";

export const config = { api: { bodyParser: false } };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32_768) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function supabaseConfig(env) {
  return {
    url: (env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, ""),
    anonKey: env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "",
  };
}

async function fetchSupabaseJson(url, key, bearer, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${bearer}`,
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  return response.json();
}

async function authenticateAppEvent(req, supabase) {
  const authorization = req.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ") || !supabase.url || !supabase.anonKey) return null;
  return fetchSupabaseJson(`${supabase.url}/auth/v1/user`, supabase.anonKey, authorization.slice(7));
}

async function adminRequest(url, supabase) {
  return fetchSupabaseJson(url, supabase.serviceKey, supabase.serviceKey);
}

export async function handleAuthHook({ rawBody, req, env, mailer }) {
  if (!env.SEND_EMAIL_HOOK_SECRET) return { status: 503, body: { error: "Email de autenticación no configurado." } };
  if (!verifyStandardWebhook({ rawBody, headers: req.headers, secret: env.SEND_EMAIL_HOOK_SECRET })) {
    return { status: 401, body: { error: "Firma de evento inválida." } };
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return { status: 400, body: { error: "Evento inválido." } }; }
  const emailData = event?.email_data;
  const user = event?.user;
  const supabase = supabaseConfig(env);
  const recipient = String(user?.email ?? "").trim();
  if (!recipient || !emailData || !supabase.url) return { status: 400, body: { error: "Evento incompleto." } };

  const emailActionType = String(emailData.email_action_type ?? "");
  const webhookId = req.headers["webhook-id"];
  const redirectTo = String(emailData.redirect_to || emailData.site_url || "");
  const makeVerifyUrl = (hash, type = emailActionType, redirect = redirectTo) => {
    if (!hash) throw new Error("AUTH_TOKEN_MISSING");
    const url = new URL("/auth/v1/verify", supabase.url);
    url.searchParams.set("token", hash);
    url.searchParams.set("type", type);
    if (redirect) url.searchParams.set("redirect_to", redirect);
    return url.toString();
  };

  try {
    if (emailActionType === "email_change" && emailData.token_hash_new && emailData.token_hash && user.new_email) {
      const currentMail = authEmailContent(emailActionType, makeVerifyUrl(emailData.token_hash_new));
      const newMail = authEmailContent(emailActionType, makeVerifyUrl(emailData.token_hash));
      await mailer.send({ to: recipient, ...currentMail, idempotencyKey: `laburapp-auth-${webhookId}-current` });
      await mailer.send({ to: String(user.new_email), ...newMail, idempotencyKey: `laburapp-auth-${webhookId}-new` });
    } else if (emailActionType === "email_change") {
      const hash = emailData.token_hash || emailData.token_hash_new;
      const recipientForChange = String(user?.new_email || recipient).trim();
      const mail = authEmailContent(emailActionType, makeVerifyUrl(hash));
      await mailer.send({ to: recipientForChange, ...mail, idempotencyKey: `laburapp-auth-${webhookId}-new` });
    } else {
      const hash = emailData.token_hash || emailData.token_hash_new;
      const mail = authEmailContent(emailActionType, makeVerifyUrl(hash));
      await mailer.send({ to: recipient, ...mail, idempotencyKey: `laburapp-auth-${webhookId}` });
    }
    return { status: 200, body: {} };
  } catch (error) {
    console.error("[mail] auth delivery failed", { action: emailActionType, reason: error instanceof Error ? error.message : "unknown" });
    return { status: 502, body: { error: "No se pudo entregar el correo de autenticación." } };
  }
}

async function handleSubscriptionReceived({ payload, req, env, mailer }) {
  const supabase = supabaseConfig(env);
  if (!supabase.url || !supabase.anonKey || !supabase.serviceKey) return { status: 503, body: { error: "Email transaccional no configurado." } };
  const user = await authenticateAppEvent(req, supabase);
  if (!user?.id || !user.email) return { status: 401, body: { error: "Sesión inválida." } };
  if (typeof payload.requestId !== "string" || !UUID_PATTERN.test(payload.requestId)) return { status: 400, body: { error: "Solicitud inválida." } };

  const query = new URLSearchParams({
    select: "id,client_id,plan_months,amount_ars,status",
    id: `eq.${payload.requestId}`,
    client_id: `eq.${user.id}`,
    limit: "1",
  });
  const rows = await adminRequest(`${supabase.url}/rest/v1/subscription_requests?${query}`, supabase);
  const request = rows?.[0];
  if (!request) return { status: 404, body: { error: "Solicitud no encontrada." } };

  const mail = subscriptionReceivedEmail({ months: Number(request.plan_months), amount: Number(request.amount_ars) });
  try {
    await mailer.send({ to: user.email, ...mail, idempotencyKey: `laburapp-subscription-received-${request.id}` });
    return { status: 200, body: { ok: true } };
  } catch (error) {
    console.error("[mail] subscription receipt delivery failed", { reason: error instanceof Error ? error.message : "unknown" });
    return { status: 502, body: { error: "No se pudo enviar la confirmación." } };
  }
}

async function handleSubscriptionActivated({ payload, req, env, mailer }) {
  const supabase = supabaseConfig(env);
  if (!supabase.url || !supabase.anonKey || !supabase.serviceKey) return { status: 503, body: { error: "Email transaccional no configurado." } };
  const user = await authenticateAppEvent(req, supabase);
  if (!user?.id) return { status: 401, body: { error: "Sesión inválida." } };
  if (typeof payload.publicId !== "string" || !/^LP\d{6,10}$/i.test(payload.publicId)) return { status: 400, body: { error: "Cuenta inválida." } };

  const rolesQuery = new URLSearchParams({ select: "role", user_id: `eq.${user.id}`, role: "eq.admin", limit: "1" });
  const roles = await adminRequest(`${supabase.url}/rest/v1/user_roles?${rolesQuery}`, supabase);
  if (!roles?.length) return { status: 403, body: { error: "Acción no autorizada." } };

  const profileQuery = new URLSearchParams({ select: "id,full_name", public_id: `eq.${payload.publicId}`, limit: "1" });
  const profiles = await adminRequest(`${supabase.url}/rest/v1/profiles?${profileQuery}`, supabase);
  const profile = profiles?.[0];
  if (!profile?.id) return { status: 404, body: { error: "Cuenta no encontrada." } };

  const membershipQuery = new URLSearchParams({ select: "plan_code,status,current_period_ends_at,active_plan_months", client_id: `eq.${profile.id}`, limit: "1" });
  const memberships = await adminRequest(`${supabase.url}/rest/v1/client_memberships?${membershipQuery}`, supabase);
  const membership = memberships?.[0];
  if (membership?.plan_code !== "plus" || membership.status !== "active") return { status: 409, body: { error: "Premium todavía no está activo." } };

  const authUser = await adminRequest(`${supabase.url}/auth/v1/admin/users/${encodeURIComponent(profile.id)}`, supabase);
  if (!authUser?.email) return { status: 404, body: { error: "No se encontró el correo de la cuenta." } };

  const periodEndsAt = membership.current_period_ends_at;
  const idempotencyKey = `laburapp-premium-activated-${profile.id}-${createHmac("sha256", "laburapp-mail").update(String(periodEndsAt ?? "active")).digest("hex").slice(0, 24)}`;
  const mail = subscriptionActivatedEmail({ months: Number(membership.active_plan_months) || undefined, periodEndsAt });
  try {
    await mailer.send({ to: authUser.email, ...mail, idempotencyKey });
    return { status: 200, body: { ok: true } };
  } catch (error) {
    console.error("[mail] premium activation delivery failed", { reason: error instanceof Error ? error.message : "unknown" });
    return { status: 502, body: { error: "No se pudo enviar la confirmación." } };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return respond(res, 405, { error: "Método no permitido." });

  let rawBody;
  try { rawBody = await readRawBody(req); } catch { return respond(res, 413, { error: "Solicitud demasiado grande." }); }
  if (req.headers["webhook-id"]) {
    const result = await handleAuthHook({ rawBody, req, env: process.env, mailer: new MailService() });
    return respond(res, result.status, result.body);
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch { return respond(res, 400, { error: "Solicitud inválida." }); }
  const context = { payload, req, env: process.env, mailer: new MailService() };
  if (payload?.event === "subscription.received") {
    const result = await handleSubscriptionReceived(context);
    return respond(res, result.status, result.body);
  }
  if (payload?.event === "subscription.activated") {
    const result = await handleSubscriptionActivated(context);
    return respond(res, result.status, result.body);
  }
  return respond(res, 400, { error: "Tipo de correo no permitido." });
}
