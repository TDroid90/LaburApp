import crypto from "node:crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function json(res, status, body) {
  res.status(status).json(body);
}

function base64url(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
}

function safeSecretEqual(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ""));
  const rightBuffer = Buffer.from(String(right ?? ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
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

function safeFolderPart(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Cliente";
}

function hasUnsafePathPart(value) {
  const text = String(value ?? "");
  return !text || text.startsWith("/") || text.includes("\\") || text.includes("//")
    || text.split("/").some((part) => !part || part === "." || part === ".." || /[\u0000-\u001f]/.test(part));
}

function validateQueueRow(row, userId, profileFolder) {
  if (row[row.ownerColumn] !== userId) throw new Error("La cola no pertenece a la sesión.");
  if (row.target_root_folder_id !== null) throw new Error("La raíz de Drive debe resolverse en el servidor.");
  if (hasUnsafePathPart(row.source_storage_path) || !row.source_storage_path.startsWith(`${userId}/`)) {
    throw new Error("Ruta de origen no autorizada.");
  }
  if (hasUnsafePathPart(row.target_relative_path)) throw new Error("Ruta de destino no autorizada.");
  if (!row.target_file_name || /[\\/\u0000-\u001f]/.test(row.target_file_name)) {
    throw new Error("Nombre de archivo no autorizado.");
  }
  if (row.table === "drive_media_outbox" && !row.target_relative_path.startsWith(`${profileFolder}/Trabajos/`)) {
    throw new Error("Carpeta profesional no autorizada.");
  }
  if (row.table === "client_drive_media_outbox") {
    const expected = `Clientes/${profileFolder}/Solicitudes/SOL_${String(row.request_id).slice(0, 8).toUpperCase()}`;
    if (row.target_relative_path !== expected) throw new Error("Carpeta de solicitud no autorizada.");
  }
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

async function findFolder(token, parentId, name) {
  const query = `'${driveName(parentId)}' in parents and name='${driveName(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("fields", "files(id,name)");
  searchUrl.searchParams.set("pageSize", "2");
  searchUrl.searchParams.set("supportsAllDrives", "true");
  searchUrl.searchParams.set("includeItemsFromAllDrives", "true");
  const found = await fetch(searchUrl, { headers: { authorization: `Bearer ${token}` } });
  if (!found.ok) throw new Error("No pudimos consultar la carpeta de limpieza en Drive.");
  const files = (await found.json()).files ?? [];
  if (files.length > 1) throw new Error("La ruta de limpieza es ambigua.");
  return files[0]?.id ?? null;
}

async function isDescendantOfRoot(token, fileId, rootId) {
  let current = fileId;
  for (let depth = 0; depth < 32; depth += 1) {
    if (current === rootId) return true;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(current)}?fields=id,parents,trashed&supportsAllDrives=true`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("No pudimos verificar la ubicación del archivo en Drive.");
    const file = await response.json();
    if (file.trashed || !file.parents?.length) return false;
    if (file.parents.includes(rootId)) return true;
    current = file.parents[0];
  }
  return false;
}

async function deleteDriveFile(token, fileId) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Drive rechazó la limpieza (${response.status}).`);
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

async function supabaseRequest(url, serviceKey, path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`No pudimos actualizar la copia privada (${response.status}).`);
  return response;
}

async function processDriveCleanup({ supabaseUrl, serviceKey, token, projectRootFolderId, professionalsFolderId }) {
  const rowsResponse = await fetch(`${supabaseUrl}/rest/v1/drive_cleanup_outbox?select=id,root_kind,drive_file_id,relative_path,attempts&status=in.(pending,failed)&order=created_at.asc&limit=25`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  });
  if (!rowsResponse.ok) throw new Error("No pudimos leer la cola de limpieza de Drive.");
  const rows = await rowsResponse.json();
  let completed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await supabaseRequest(supabaseUrl, serviceKey, `drive_cleanup_outbox?id=eq.${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "processing", attempts: row.attempts + 1, last_error: null, updated_at: new Date().toISOString() }),
      });
      const rootId = row.root_kind === "professionals" ? professionalsFolderId : row.root_kind === "project" ? projectRootFolderId : null;
      if (!rootId) throw new Error("Raíz de limpieza no autorizada.");
      let targetId = row.drive_file_id || null;
      if (targetId) {
        const isWithinRoot = await isDescendantOfRoot(token, targetId, rootId);
        if (isWithinRoot === false) throw new Error("El archivo no pertenece a la raíz autorizada.");
        if (isWithinRoot === null) targetId = null;
      }
      if (!targetId && row.relative_path) {
        if (hasUnsafePathPart(row.relative_path)) throw new Error("Ruta de limpieza no autorizada.");
        let folderId = rootId;
        for (const segment of row.relative_path.split("/").filter(Boolean)) {
          folderId = await findFolder(token, folderId, segment);
          if (!folderId) break;
        }
        targetId = folderId;
      }
      if (targetId) await deleteDriveFile(token, targetId);
      await supabaseRequest(supabaseUrl, serviceKey, `drive_cleanup_outbox?id=eq.${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", last_error: null, updated_at: new Date().toISOString() }),
      });
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado al limpiar Drive.";
      try {
        await supabaseRequest(supabaseUrl, serviceKey, `drive_cleanup_outbox?id=eq.${row.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "failed", last_error: message, updated_at: new Date().toISOString() }),
        });
      } catch { /* El cron reintentará el registro. */ }
      failed += 1;
    }
  }
  return { processed: rows.length, completed, failed };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Método no permitido." });
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(res, 503, { error: "Falta configurar Supabase en el sincronizador." });
  const googleEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const googlePrivateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  if (!googleEmail || !googlePrivateKey) return json(res, 503, { error: "La copia quedó en espera: falta conectar la credencial permanente de Google Drive." });
  const projectRootFolderId = process.env.GOOGLE_DRIVE_PROJECT_ROOT_FOLDER_ID;
  const professionalsFolderId = process.env.GOOGLE_DRIVE_PROFESSIONALS_FOLDER_ID;
  if (!projectRootFolderId || !professionalsFolderId) return json(res, 503, { error: "Falta configurar las carpetas de Drive para este ambiente." });

  const token = await googleAccessToken(googleEmail, googlePrivateKey);
  const bearer = req.headers.authorization ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && safeSecretEqual(bearer, `Bearer ${cronSecret}`)) {
    const cleanup = await processDriveCleanup({ supabaseUrl, serviceKey, token, projectRootFolderId, professionalsFolderId });
    return json(res, cleanup.failed ? 207 : 200, cleanup);
  }
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: serviceKey, authorization: bearer } });
  if (!userResponse.ok) return json(res, 401, { error: "Sesión inválida." });
  const user = await userResponse.json();
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=public_id,full_name&id=eq.${encodeURIComponent(user.id)}&limit=1`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  });
  if (!profileResponse.ok) return json(res, 502, { error: "No pudimos identificar la carpeta privada del usuario." });
  const profile = (await profileResponse.json())[0];
  if (!profile?.public_id) return json(res, 404, { error: "La cuenta no tiene identificador público." });
  const profileFolder = `${safeFolderPart(profile.public_id)}_${safeFolderPart(profile.full_name)}`;
  const accountFolder = `Clientes/${profileFolder}`;
  const nameParts = String(profile.full_name ?? "Cliente").trim().split(/\s+/);
  const surnameName = safeFolderPart(nameParts.length > 1 ? `${nameParts.at(-1)}${nameParts.slice(0, -1).join("")}` : nameParts[0]);
  const queueDefinitions = [
    {
      table: "drive_media_outbox",
      ownerColumn: "provider_id",
      sourceBucket: "portfolio",
      targetTable: "provider_portfolio_items",
      allowedRoot: professionalsFolderId,
      extraSelect: ",completed_work_id",
    },
    {
      table: "client_drive_media_outbox",
      ownerColumn: "client_id",
      sourceBucket: "request-photos",
      targetTable: "client_request_attachments",
      allowedRoot: projectRootFolderId,
      extraSelect: ",request_id",
    },
    {
      table: "receipt_drive_outbox",
      ownerColumn: "owner_id",
      sourceBucket: "private-receipts",
      targetTable: null,
      allowedRoot: projectRootFolderId,
      extraSelect: ",receipt_kind",
    },
  ];
  const rows = [];
  for (const queue of queueDefinitions) {
    const rowsUrl = new URL(`${supabaseUrl}/rest/v1/${queue.table}`);
    rowsUrl.searchParams.set("select", `id,${queue.ownerColumn},source_storage_path,target_root_folder_id,target_relative_path,target_file_name,attempts,created_at${queue.extraSelect ?? ""}`);
    rowsUrl.searchParams.set(queue.ownerColumn, `eq.${user.id}`);
    rowsUrl.searchParams.set("status", "in.(pending,failed)");
    rowsUrl.searchParams.set("order", "created_at.asc");
    rowsUrl.searchParams.set("limit", "9");
    const pendingResponse = await fetch(rowsUrl, { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } });
    if (!pendingResponse.ok) return json(res, 502, { error: "No pudimos leer la cola de imágenes." });
    rows.push(...(await pendingResponse.json()).map((row) => ({ ...row, ...queue })));
  }
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await supabaseRequest(supabaseUrl, serviceKey, `${row.table}?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "processing", attempts: row.attempts + 1, last_error: null, updated_at: new Date().toISOString() }) });
      validateQueueRow(row, user.id, profileFolder);
      const relativePath = row.receipt_kind
        ? `${accountFolder}/${row.receipt_kind === "subscription" ? "Suscripciones" : "Comprobantes"}`
        : row.target_relative_path;
      const fileName = row.receipt_kind === "subscription"
        ? `${safeFolderPart(profile.public_id)}_${String(row.created_at).slice(0, 10)}_${surnameName}.jpg`
        : row.receipt_kind === "completion"
          ? `${safeFolderPart(profile.public_id)}_${String(row.created_at).slice(0, 10)}_Trabajo_${row.id}.jpg`
          : row.target_file_name;
      let folderId = row.allowedRoot;
      for (const segment of relativePath.split("/").filter(Boolean)) folderId = await ensureFolder(token, folderId, segment);
      const sourcePath = row.source_storage_path.split("/").map(encodeURIComponent).join("/");
      const sourceResponse = await fetch(`${supabaseUrl}/storage/v1/object/${row.sourceBucket}/${sourcePath}`, {
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      });
      if (!sourceResponse.ok) throw new Error("No pudimos recuperar la imagen optimizada.");
      const driveFile = await uploadToDrive(token, folderId, fileName, sourceResponse);
      await supabaseRequest(supabaseUrl, serviceKey, `${row.table}?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "synced", drive_file_id: driveFile.id, last_error: null, updated_at: new Date().toISOString() }) });
      const targetTable = row.targetTable ?? (row.receipt_kind === "subscription" ? "subscription_requests" : "completion_confirmations");
      const targetColumn = row.targetTable ? "storage_path" : "receipt_path";
      await supabaseRequest(supabaseUrl, serviceKey, `${targetTable}?${targetColumn}=eq.${encodeURIComponent(row.source_storage_path)}`, { method: "PATCH", body: JSON.stringify({ drive_sync_status: "synced", drive_file_id: driveFile.id }) });
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado al copiar la imagen.";
      try { await supabaseRequest(supabaseUrl, serviceKey, `${row.table}?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed", last_error: message, updated_at: new Date().toISOString() }) }); } catch { /* El intento se reanudará en la próxima sincronización. */ }
      failed += 1;
    }
  }
  return json(res, failed ? 207 : 200, { processed: rows.length, synced, failed });
}
