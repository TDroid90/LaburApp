const BRAND = {
  navy: "#071521",
  blue: "#49b2f5",
  orange: "#ff7800",
  text: "#1b2b3a",
  muted: "#617487",
  surface: "#f3f8fc",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMailTemplate({ title, paragraphs, actionLabel, actionUrl, footnote }) {
  const safeParagraphs = paragraphs.map((paragraph) => `<p style="margin:0 0 14px;color:${BRAND.text};font-size:16px;line-height:1.6">${escapeHtml(paragraph)}</p>`).join("");
  const action = actionLabel && actionUrl
    ? `<p style="margin:26px 0 22px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:${BRAND.orange};border-radius:10px;color:#fff;font-weight:700;padding:13px 22px;text-decoration:none">${escapeHtml(actionLabel)}</a></p>`
    : "";
  const safeFootnote = footnote ? `<p style="margin:18px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.5">${escapeHtml(footnote)}</p>` : "";

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:${BRAND.surface};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.surface};padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dce8f0;border-radius:16px;overflow:hidden"><tr><td style="background:${BRAND.navy};padding:20px 28px;border-bottom:4px solid ${BRAND.blue}"><div style="font-size:26px;font-weight:800;letter-spacing:-.5px;color:#fff">Labur<span style="color:${BRAND.blue}">App</span></div><div style="margin-top:4px;color:#c3d7e6;font-size:12px">Servicios locales, acuerdos claros.</div></td></tr><tr><td style="padding:30px 28px 26px"><h1 style="font-size:24px;line-height:1.25;margin:0 0 18px;color:${BRAND.navy}">${escapeHtml(title)}</h1>${safeParagraphs}${action}${safeFootnote}</td></tr><tr><td style="border-top:1px solid #e5edf3;padding:17px 28px;color:${BRAND.muted};font-size:12px;line-height:1.5">Este correo fue enviado por LaburApp. Si necesitás ayuda, respondé este mensaje.</td></tr></table></td></tr></table></body></html>`;
}

const AUTH_EMAILS = {
  signup: {
    subject: "Confirmá tu registro en LaburApp",
    title: "Confirmación de registro",
    paragraph: "LaburApp necesita que confirmes el registro para activar tu cuenta.",
    action: "Confirmar mi registro",
    footnote: "Si no creaste esta cuenta, podés ignorar este correo.",
  },
  recovery: {
    subject: "Recuperá tu contraseña de LaburApp",
    title: "Restablecer contraseña",
    paragraph: "Recibimos una solicitud para cambiar la contraseña de tu cuenta.",
    action: "Crear una contraseña nueva",
    footnote: "Si no pediste este cambio, ignorá el mensaje. Tu contraseña actual seguirá vigente.",
  },
  email_change: {
    subject: "Confirmá el cambio de correo en LaburApp",
    title: "Confirmación de correo",
    paragraph: "Confirmá el cambio de dirección de correo asociado a tu cuenta.",
    action: "Confirmar correo",
    footnote: "Si no solicitaste el cambio, ignorá este mensaje.",
  },
  magiclink: {
    subject: "Ingresá a LaburApp",
    title: "Tu enlace para ingresar",
    paragraph: "Usá este enlace seguro para ingresar a tu cuenta de LaburApp.",
    action: "Ingresar a LaburApp",
    footnote: "Si no solicitaste el enlace, ignorá este mensaje.",
  },
  invite: {
    subject: "Tenés una invitación a LaburApp",
    title: "Invitación a LaburApp",
    paragraph: "Te invitaron a formar parte de LaburApp. Confirmá para continuar.",
    action: "Aceptar invitación",
    footnote: "Si no esperabas esta invitación, ignorá este correo.",
  },
  email: {
    subject: "Confirmá tu correo en LaburApp",
    title: "Verificación de correo",
    paragraph: "Confirmá que esta dirección de correo te pertenece.",
    action: "Confirmar correo",
    footnote: "Si no solicitaste esta acción, ignorá este mensaje.",
  },
};

export function authEmailContent(actionType, verifyUrl) {
  const template = AUTH_EMAILS[actionType];
  if (!template || !verifyUrl) throw new Error("UNSUPPORTED_AUTH_EMAIL");
  return {
    subject: template.subject,
    html: renderMailTemplate({
      title: template.title,
      paragraphs: [template.paragraph],
      actionLabel: template.action,
      actionUrl: verifyUrl,
      footnote: template.footnote,
    }),
    text: `${template.title}\n\n${template.paragraph}\n\n${template.action}: ${verifyUrl}\n\n${template.footnote}`,
  };
}

export function subscriptionReceivedEmail({ months, amount }) {
  const plan = `${months} ${months === 1 ? "mes" : "meses"}`;
  const amountText = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
  const title = "Recibimos tu comprobante";
  const paragraphs = [
    `Recibimos el comprobante de transferencia para tu plan de ${plan} (${amountText}).`,
    "El equipo de LaburApp verificará la transferencia manualmente. Premium se activa después de esa comprobación; puede demorar hasta 72 horas.",
  ];
  return { subject: title, html: renderMailTemplate({ title, paragraphs }), text: `${title}\n\n${paragraphs.join("\n\n")}` };
}

export function subscriptionActivatedEmail({ months, periodEndsAt }) {
  const title = "Tu suscripción Premium está activa";
  const plan = months ? `Tu plan de ${months} ${months === 1 ? "mes" : "meses"} ya está activo.` : "Premium ya está activo en tu cuenta.";
  const paragraphs = [plan, "Ya podés usar los beneficios Premium disponibles en LaburApp."];
  const endsAt = periodEndsAt ? new Date(periodEndsAt) : null;
  if (endsAt && !Number.isNaN(endsAt.getTime())) paragraphs.push(`La vigencia actual termina el ${endsAt.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}.`);
  return { subject: title, html: renderMailTemplate({ title, paragraphs }), text: `${title}\n\n${paragraphs.join("\n\n")}` };
}
