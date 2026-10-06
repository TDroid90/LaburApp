export const DEFAULT_MAIL = {
  noreply: "LaburApp <no-reply@laburapp.work>",
  support: "LaburApp Soporte <soporte@laburapp.work>",
  contact: "LaburApp <contacto@laburapp.work>",
  info: "LaburApp <info@laburapp.work>",
};

export class MailService {
  constructor({ env = process.env, fetchImpl = fetch } = {}) {
    this.env = env;
    this.fetchImpl = fetchImpl;
  }

  async send({ to, subject, html, text, idempotencyKey, from, replyTo }) {
    const apiKey = this.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("MAIL_NOT_CONFIGURED");
    if (!to || !subject || !html || !text) throw new Error("MAIL_PAYLOAD_INVALID");

    const headers = {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const response = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: from ?? this.env.MAIL_NOREPLY ?? DEFAULT_MAIL.noreply,
        to: [to],
        reply_to: replyTo ?? this.env.MAIL_SUPPORT ?? DEFAULT_MAIL.support,
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) throw new Error(`MAIL_PROVIDER_ERROR_${response.status}`);
    return response.json();
  }
}
