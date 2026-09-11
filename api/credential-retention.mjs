function respond(res, status, body) {
  res.setHeader("cache-control", "no-store");
  return res.status(status).json(body);
}

function serviceHeaders(serviceKey, json = false) {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    ...(json ? { "content-type": "application/json", prefer: "return=minimal" } : {}),
  };
}

async function patchCredential(supabaseUrl, serviceKey, id, changes) {
  return fetch(`${supabaseUrl}/rest/v1/credentials?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: serviceHeaders(serviceKey, true),
    body: JSON.stringify(changes),
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return respond(res, 405, { error: "Método no permitido." });
  const cronSecret = process.env.CRON_SECRET;
  const supplied = String(req.headers.authorization ?? "");
  if (!cronSecret || supplied !== `Bearer ${cronSecret}`) return respond(res, 401, { error: "No autorizado." });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) return respond(res, 503, { error: "Retención no configurada." });

  const now = new Date().toISOString();
  const purgeResponse = await fetch(
    `${supabaseUrl}/rest/v1/credentials?select=id,private_path,status&document_purge_at=lte.${encodeURIComponent(now)}&document_deleted_at=is.null&private_path=not.is.null`,
    { headers: serviceHeaders(serviceKey) },
  );
  if (!purgeResponse.ok) return respond(res, 502, { error: "No se pudo consultar la cola de eliminación." });

  let documentsDeleted = 0;
  let failures = 0;
  for (const credential of await purgeResponse.json()) {
    const encodedPath = String(credential.private_path).split("/").map(encodeURIComponent).join("/");
    const deleted = await fetch(`${supabaseUrl}/storage/v1/object/provider-credentials/${encodedPath}`, {
      method: "DELETE",
      headers: serviceHeaders(serviceKey),
    });
    if (!deleted.ok && deleted.status !== 404) {
      failures += 1;
      continue;
    }
    const updated = await patchCredential(supabaseUrl, serviceKey, credential.id, {
      private_path: null,
      document_deleted_at: now,
      ...(credential.status === "pending" ? {
        status: "rejected",
        review_notes: "El archivo alcanzó el plazo máximo de conservación. Volvé a cargar un comprobante legible.",
      } : {}),
    });
    if (updated.ok) documentsDeleted += 1;
    else failures += 1;
  }

  const ocrPurgeResponse = await fetch(
    `${supabaseUrl}/rest/v1/credentials?select=id&ocr_purge_at=lte.${encodeURIComponent(now)}&ocr_deleted_at=is.null&ocr_text=not.is.null`,
    { headers: serviceHeaders(serviceKey) },
  );
  if (!ocrPurgeResponse.ok) return respond(res, 502, { error: "No se pudo consultar la cola temporal de lectura." });

  let ocrRecordsDeleted = 0;
  for (const credential of await ocrPurgeResponse.json()) {
    const updated = await patchCredential(supabaseUrl, serviceKey, credential.id, {
      ocr_text: null,
      ocr_fields: {},
      ocr_deleted_at: now,
    });
    if (updated.ok) ocrRecordsDeleted += 1;
    else failures += 1;
  }

  const renewalResponse = await fetch(
    `${supabaseUrl}/rest/v1/credentials?select=id,provider_id,kind&status=eq.verified&review_due_at=lte.${encodeURIComponent(now)}`,
    { headers: serviceHeaders(serviceKey) },
  );
  if (!renewalResponse.ok) return respond(res, 502, { error: "No se pudo consultar la cola de renovación." });

  let renewalsRequested = 0;
  for (const credential of await renewalResponse.json()) {
    const expired = await patchCredential(supabaseUrl, serviceKey, credential.id, { status: "expired" });
    if (!expired.ok) {
      failures += 1;
      continue;
    }
    const notification = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: "POST",
      headers: serviceHeaders(serviceKey, true),
      body: JSON.stringify({
        user_id: credential.provider_id,
        kind: "credential_renewal",
        title: "Actualizá tu documentación",
        body: "La verificación llegó a su fecha de actualización. Subí un comprobante vigente para renovarla.",
        data: { credential_id: credential.id, certification: credential.kind },
      }),
    });
    if (notification.ok) renewalsRequested += 1;
    else failures += 1;
  }

  return respond(res, failures ? 207 : 200, { ok: failures === 0, documentsDeleted, ocrRecordsDeleted, renewalsRequested, failures });
}
