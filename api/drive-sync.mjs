import crypto from "node:crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function json(res, status, body) {
  res.status(status).json(body);
}

function base64url(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
}

async function googleAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url({ alg: "RS256", typ: "JWT" })}.${base64url({ iss: clientEmail, scope: DRIVE_SCOPE, aud: GOOGLE_TOKEN_URL, iat: now, exp: now + 3600 })}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey.replace(/\\n/g, "\n"));
  const assertion = `${unsigned}.${signature.toString("base64url")}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`Google rechazó la credencial (${response.status}).`);
  return (await response.json()).access_token;
}

function driveName(value) {
  return String(value).replace(/'/g, "\\'");
}

async function ensureFolder(token, parentId, name) {
  const query = `'${driveName(parentId)}' in parents and name='${driveName(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("fields", "files(id,name)");
  searchUrl.searchParams.set("pageSize", "1");
  searchUrl.searchParams.set("supportsAllDrives", "true");
  searchUrl.searchParams.set("includeItemsFromAllDrives", "true");
  const found = await fetch(searchUrl, { headers: { authorization: `Bearer ${token}` } });
  if (!found.ok) throw new Error(`No pudimos consultar la carpeta ${name} en Drive.`);
  const files = (await found.json()).files ?? [];
  if (files[0]?.id) return files[0].id;
  const created = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  if (!created.ok) throw new Error(`No pudimos crear la carpeta ${name} en Drive.`);
  return (await created.json()).id;
}

async function uploadToDrive(token, parentId, name, sourceResponse) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ name, parents: [parentId] })], { type: "application/json" }));
  form.append("file", await sourceResponse.blob(), name);
  const uploaded = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  if (!uploaded.ok) throw new Error(`Drive rechazó la imagen (${uploaded.status}).`);
  return uploaded.json();
}

function supabaseRequest(url, serviceKey, path, options = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
      ...(options.headers ?? {}),
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Método no permitido." });
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(res, 503, { error: "Falta configurar Supabase en el sincronizador." });
  const bearer = req.headers.authorization ?? "";
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: serviceKey, authorization: bearer } });
  if (!userResponse.ok) return json(res, 401, { error: "Sesión inválida." });
  const user = await userResponse.json();
  const googleEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const googlePrivateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  if (!googleEmail || !googlePrivateKey) return json(res, 503, { error: "La copia quedó en espera: falta conectar la credencial permanente de Google Drive." });

  const token = await googleAccessToken(googleEmail, googlePrivateKey);
  const rowsUrl = new URL(`${supabaseUrl}/rest/v1/drive_media_outbox`);
  rowsUrl.searchParams.set("select", "id,provider_id,source_storage_path,target_root_folder_id,target_relative_path,target_file_name,attempts");
  rowsUrl.searchParams.set("provider_id", `eq.${user.id}`);
  rowsUrl.searchParams.set("status", "in.(pending,failed)");
  rowsUrl.searchParams.set("order", "created_at.asc");
  rowsUrl.searchParams.set("limit", "9");
  const pendingResponse = await fetch(rowsUrl, { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } });
  if (!pendingResponse.ok) return json(res, 502, { error: "No pudimos leer la cola de imágenes." });
  const rows = await pendingResponse.json();
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await supabaseRequest(supabaseUrl, serviceKey, `drive_media_outbox?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "processing", attempts: row.attempts + 1, last_error: null, updated_at: new Date().toISOString() }) });
      let folderId = row.target_root_folder_id;
      for (const segment of row.target_relative_path.split("/").filter(Boolean)) folderId = await ensureFolder(token, folderId, segment);
      const sourcePath = row.source_storage_path.split("/").map(encodeURIComponent).join("/");
      const sourceResponse = await fetch(`${supabaseUrl}/storage/v1/object/public/portfolio/${sourcePath}`);
      if (!sourceResponse.ok) throw new Error("No pudimos recuperar la imagen optimizada.");
      const driveFile = await uploadToDrive(token, folderId, row.target_file_name, sourceResponse);
      await supabaseRequest(supabaseUrl, serviceKey, `drive_media_outbox?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "synced", drive_file_id: driveFile.id, last_error: null, updated_at: new Date().toISOString() }) });
      await supabaseRequest(supabaseUrl, serviceKey, `provider_portfolio_items?storage_path=eq.${encodeURIComponent(row.source_storage_path)}`, { method: "PATCH", body: JSON.stringify({ drive_sync_status: "synced", drive_file_id: driveFile.id }) });
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado al copiar la imagen.";
      await supabaseRequest(supabaseUrl, serviceKey, `drive_media_outbox?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed", last_error: message, updated_at: new Date().toISOString() }) });
      failed += 1;
    }
  }
  return json(res, failed ? 207 : 200, { processed: rows.length, synced, failed });
}
