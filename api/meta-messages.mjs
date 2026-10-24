import { createHmac, timingSafeEqual } from "node:crypto";
import { saveEarlyAccessAndEmail, validateEarlyAccess } from "./early-access.mjs";

export const config = { api: { bodyParser: false } };

const MAX_BODY_BYTES = 64_000;

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function validMetaSignature(body, signature, appSecret) {
  if (!appSecret || typeof signature !== "string" || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", appSecret).update(body).digest();
  const received = Buffer.from(signature.slice(7), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function extractGmail(text) {
  if (typeof text !== "string" || text.length > 4_000) return null;
  const matches = [...text.matchAll(/(?:^|[^a-z0-9.!#$%&'*+/=?^_`{|}~-])([a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com)(?![a-z0-9.-])/gi)]
    .map((match) => match[1].toLowerCase());
  const distinct = [...new Set(matches)];
  return distinct.length === 1 && validateEarlyAccess({ name: "Persona interesada", email: distinct[0] })
    ? distinct[0]
    : null;
}

export function inboundGmails(payload) {
  if (!payload || !["page", "instagram"].includes(payload.object) || !Array.isArray(payload.entry)) return [];
  const source = payload.object === "instagram" ? "meta_instagram" : "meta_messenger";
  const records = [];
  for (const entry of payload.entry) {
    if (!Array.isArray(entry?.messaging)) continue;
    for (const event of entry.messaging) {
      if (event?.message?.is_echo || !event?.sender?.id || event.sender.id === event?.recipient?.id) continue;
      const email = extractGmail(event?.message?.text);
      if (email) records.push({ name: "Persona interesada", email, source });
    }
  }
  return records;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (req.method === "GET") {
    const query = req.query ?? Object.fromEntries(new URL(req.url, "https://laburapp.work").searchParams);
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];
    if (verifyToken && mode === "subscribe" && token === verifyToken && typeof challenge === "string") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }
  if (req.method !== "POST") return res.status(405).end();
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !verifyToken) return res.status(503).end();

  let body;
  try { body = await readBody(req); }
  catch (error) { return res.status(error?.message === "BODY_TOO_LARGE" ? 413 : 400).end(); }
  if (!validMetaSignature(body, req.headers["x-hub-signature-256"], appSecret)) {
    return res.status(401).end();
  }

  let payload;
  try { payload = JSON.parse(body.toString("utf8")); }
  catch { return res.status(400).end(); }

  for (const record of inboundGmails(payload)) {
    const result = await saveEarlyAccessAndEmail(record, record.source);
    if (result.status !== 201 || !result.body.emailSent) return res.status(503).end();
  }
  return res.status(200).send("EVENT_RECEIVED");
}
