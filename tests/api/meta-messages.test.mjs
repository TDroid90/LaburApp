import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Readable } from "node:stream";
import handler, { extractGmail, inboundGmails, validMetaSignature } from "../../api/meta-messages.mjs";

function response() {
  return {
    code: null,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; },
    end() { return this; },
  };
}

test("verifies the raw Meta body with a constant-time HMAC comparison", () => {
  const body = Buffer.from('{"object":"page"}');
  const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
  assert.equal(validMetaSignature(body, signature, "secret"), true);
  assert.equal(validMetaSignature(Buffer.from('{"object":"instagram"}'), signature, "secret"), false);
  assert.equal(validMetaSignature(body, "sha256=wrong", "secret"), false);
  assert.equal(validMetaSignature(body, signature, ""), false);
});

test("extracts only one unambiguous Gmail from a direct message", () => {
  assert.equal(extractGmail("Mi Gmail es Ana.Test@Gmail.com, gracias"), "ana.test@gmail.com");
  assert.equal(extractGmail("ana@gmail.com y otra@gmail.com"), null);
  assert.equal(extractGmail("ana@gmail.com.ar"), null);
  assert.equal(extractGmail("ana@example.com"), null);
});

test("ignores echoes, delivery events and non-Gmail messages", () => {
  assert.deepEqual(inboundGmails({
    object: "instagram",
    entry: [{ messaging: [
      { sender: { id: "person" }, recipient: { id: "page" }, message: { text: "hola: usuario@gmail.com" } },
      { sender: { id: "page" }, recipient: { id: "person" }, message: { text: "respuesta@gmail.com", is_echo: true } },
      { sender: { id: "person" }, recipient: { id: "page" }, delivery: { mids: ["mid"] } },
    ] }],
  }), [{ name: "Persona interesada", email: "usuario@gmail.com", source: "meta_instagram" }]);
});

test("answers Meta's GET challenge only for the configured token", async () => {
  const old = process.env.META_WEBHOOK_VERIFY_TOKEN;
  process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-me";
  try {
    const ok = response();
    await handler({ method: "GET", query: { "hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "12345" } }, ok);
    assert.equal(ok.code, 200);
    assert.equal(ok.body, "12345");

    const denied = response();
    await handler({ method: "GET", query: { "hub.mode": "subscribe", "hub.verify_token": "invalid", "hub.challenge": "12345" } }, denied);
    assert.equal(denied.code, 403);
  } finally {
    if (old === undefined) delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    else process.env.META_WEBHOOK_VERIFY_TOKEN = old;
  }
});

test("rejects unauthenticated POSTs before processing messages", async () => {
  const oldSecret = process.env.META_APP_SECRET;
  const oldToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  process.env.META_APP_SECRET = "secret";
  process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-me";
  try {
    const req = Readable.from([Buffer.from('{"object":"page","entry":[]}')]);
    req.method = "POST";
    req.headers = { "x-hub-signature-256": "sha256=invalid" };
    const res = response();
    await handler(req, res);
    assert.equal(res.code, 401);
  } finally {
    if (oldSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = oldSecret;
    if (oldToken === undefined) delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    else process.env.META_WEBHOOK_VERIFY_TOKEN = oldToken;
  }
});

test("a signed Messenger Gmail reaches storage and the email sender", async () => {
  const names = ["META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  process.env.META_APP_SECRET = "meta-secret";
  process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-me";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.RESEND_API_KEY = "resend-key";
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/rest/v1/early_access_requests")) {
      return { ok: true, status: 201, text: async () => JSON.stringify([{ id: "request-id" }]) };
    }
    if (url === "https://api.resend.com/emails") {
      return { ok: true, status: 200, json: async () => ({ id: "message-id" }) };
    }
    throw new Error("Unexpected network request");
  };
  try {
    const body = Buffer.from(JSON.stringify({
      object: "page",
      entry: [{ messaging: [{ sender: { id: "person" }, recipient: { id: "page" }, message: { text: "Mi Gmail: tester@gmail.com" } }] }],
    }));
    const req = Readable.from([body]);
    req.method = "POST";
    req.headers = { "x-hub-signature-256": `sha256=${createHmac("sha256", "meta-secret").update(body).digest("hex")}` };
    const res = response();
    await handler(req, res);
    assert.equal(res.code, 200);
    assert.equal(res.body, "EVENT_RECEIVED");
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(calls[0].options.body).source, "meta_messenger");
    assert.deepEqual(JSON.parse(calls[1].options.body).to, ["tester@gmail.com"]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
