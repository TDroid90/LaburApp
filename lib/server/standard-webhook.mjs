import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyStandardWebhook({ rawBody, headers, secret, now = Date.now() }) {
  if (!secret || !rawBody) return false;
  const id = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const signature = headers["webhook-signature"];
  if (!id || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Math.floor(now / 1000) - timestampSeconds) > 300) return false;

  const encodedSecret = secret.replace(/^v1,whsec_/, "");
  let key;
  try {
    key = Buffer.from(encodedSecret, "base64");
  } catch {
    return false;
  }
  if (!key.length) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signature.split(/\s+/).some((entry) => {
    const [version, encoded] = entry.split(",", 2);
    if (version !== "v1" || !encoded) return false;
    try {
      const actual = Buffer.from(encoded, "base64");
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  });
}
