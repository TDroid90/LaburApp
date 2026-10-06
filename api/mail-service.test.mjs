import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { MailService } from "./mail-service.mjs";
import { authEmailContent, renderMailTemplate, subscriptionReceivedEmail } from "./mail-templates.mjs";
import { verifyStandardWebhook } from "./standard-webhook.mjs";
import { handleAuthHook } from "./mail.mjs";

test("MailService sends only through the server side Resend API with idempotency", async () => {
  let request;
  const service = new MailService({
    env: { RESEND_API_KEY: "server-test-key" },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: "email-id" }) };
    },
  });

  await service.send({ to: "user@example.com", subject: "Asunto", html: "<p>Hola</p>", text: "Hola", idempotencyKey: "laburapp-test-1" });

  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.headers.authorization, "Bearer server-test-key");
  assert.equal(request.options.headers["Idempotency-Key"], "laburapp-test-1");
  assert.equal(JSON.parse(request.options.body).from, "LaburApp <no-reply@laburapp.work>");
});

test("email templates escape user controlled content and keep the confirmation link behind a button", () => {
  const template = renderMailTemplate({ title: "Hola <img>", paragraphs: ["texto & seguro"], actionLabel: "Continuar", actionUrl: "https://supabase.example/verify?a=1&b=2" });
  assert.match(template, /Hola &lt;img&gt;/);
  assert.match(template, /texto &amp; seguro/);
  assert.match(template, /href="https:\/\/supabase\.example\/verify\?a=1&amp;b=2"/);
  assert.equal(authEmailContent("signup", "https://example.test/auth").subject, "Confirmá tu registro en LaburApp");
});

test("subscription receipt email describes the existing manual 72 hour verification", () => {
  const mail = subscriptionReceivedEmail({ months: 6, amount: 12000 });
  assert.equal(mail.subject, "Recibimos tu comprobante");
  assert.match(mail.text, /verificará la transferencia manualmente/);
  assert.match(mail.text, /72 horas/);
});

test("Send Email hook verifies standard webhook signatures and rejects stale or modified bodies", () => {
  const rawBody = JSON.stringify({ email_data: { email_action_type: "signup" } });
  const now = Date.now();
  const id = "msg_laburapp_test";
  const timestamp = String(Math.floor(now / 1000));
  const key = randomBytes(32);
  const secret = `v1,whsec_${key.toString("base64")}`;
  const digest = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  const headers = { "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": `v1,${digest}` };

  assert.equal(verifyStandardWebhook({ rawBody, headers, secret, now }), true);
  assert.equal(verifyStandardWebhook({ rawBody: `${rawBody} `, headers, secret, now }), false);
  assert.equal(verifyStandardWebhook({ rawBody, headers: { ...headers, "webhook-timestamp": "1" }, secret, now }), false);
});

test("email-change hook sends the correct hash to each address when secure email change is enabled", async () => {
  const rawBody = JSON.stringify({
    user: { email: "old@example.com", new_email: "new@example.com" },
    email_data: { email_action_type: "email_change", token_hash_new: "old-hash", token_hash: "new-hash", redirect_to: "laburapp://auth/callback" },
  });
  const key = randomBytes(32);
  const secret = `v1,whsec_${key.toString("base64")}`;
  const webhookId = "msg_email_change_test";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", key).update(`${webhookId}.${timestamp}.${rawBody}`).digest("base64");
  const sent = [];

  const result = await handleAuthHook({
    rawBody,
    req: { headers: { "webhook-id": webhookId, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` } },
    env: { SEND_EMAIL_HOOK_SECRET: secret, SUPABASE_URL: "https://project.supabase.co" },
    mailer: { send: async (message) => sent.push(message) },
  });

  assert.equal(result.status, 200);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].to, "old@example.com");
  assert.match(sent[0].html, /token=old-hash/);
  assert.equal(sent[1].to, "new@example.com");
  assert.match(sent[1].html, /token=new-hash/);
});

test("email-change hook sends a single token to the new address when secure email change is disabled", async () => {
  const rawBody = JSON.stringify({
    user: { email: "old@example.com", new_email: "new@example.com" },
    email_data: { email_action_type: "email_change", token_hash: "new-hash", redirect_to: "laburapp://auth/callback" },
  });
  const key = randomBytes(32);
  const secret = `v1,whsec_${key.toString("base64")}`;
  const webhookId = "msg_email_change_single_test";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", key).update(`${webhookId}.${timestamp}.${rawBody}`).digest("base64");
  const sent = [];

  const result = await handleAuthHook({
    rawBody,
    req: { headers: { "webhook-id": webhookId, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` } },
    env: { SEND_EMAIL_HOOK_SECRET: secret, SUPABASE_URL: "https://project.supabase.co" },
    mailer: { send: async (message) => sent.push(message) },
  });

  assert.equal(result.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "new@example.com");
  assert.match(sent[0].html, /token=new-hash/);
});
