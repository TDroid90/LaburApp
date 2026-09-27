import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const storageBuckets = [
  "avatars",
  "profile-photos",
  "portfolio",
  "private-documents",
  "request-photos",
  "provider-credentials",
  "private-receipts",
];

function response(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: corsHeaders });
}

async function listUserFiles(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`STORAGE_LIST_${bucket}`);
    const rows = data ?? [];
    for (const item of rows) {
      const path = `${prefix}/${item.name}`;
      if (item.id) paths.push(path);
      else paths.push(...await listUserFiles(admin, bucket, path));
    }
    if (rows.length < 100) break;
    offset += rows.length;
  }
  return paths;
}

async function removeUserStorage(admin: ReturnType<typeof createClient>, userId: string) {
  for (const bucket of storageBuckets) {
    const files = await listUserFiles(admin, bucket, userId);
    for (let index = 0; index < files.length; index += 100) {
      const { error } = await admin.storage.from(bucket).remove(files.slice(index, index + 100));
      if (error) throw new Error(`STORAGE_REMOVE_${bucket}`);
    }
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response(503, { error: "service_not_configured" });

  const authorization = request.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user?.email) return response(401, { error: "unauthorized" });

  let payload: { password?: unknown; confirmation?: unknown };
  try {
    payload = await request.json();
  } catch {
    return response(400, { error: "invalid_request" });
  }
  if (payload.confirmation !== "ELIMINAR" || typeof payload.password !== "string" || !payload.password) {
    return response(400, { error: "confirmation_required" });
  }

  const reauthClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: reauth, error: reauthError } = await reauthClient.auth.signInWithPassword({
    email: user.email,
    password: payload.password,
  });
  if (reauthError || reauth.user?.id !== user.id) return response(403, { error: "reauthentication_failed" });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    await removeUserStorage(admin, user.id);
  } catch {
    return response(502, { error: "storage_cleanup_failed", retryable: true });
  }

  const { error: prepareError } = await admin.rpc("prepare_account_deletion", { p_user_id: user.id });
  if (prepareError) return response(500, { error: "account_cleanup_failed", retryable: true });

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
  if (deleteError) {
    await admin.from("account_deletion_requests").update({
      status: "failed",
      last_error: "AUTH_DELETE_FAILED",
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    return response(502, { error: "auth_deletion_failed", retryable: true });
  }

  await admin.from("account_deletion_requests").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  return response(200, { deleted: true });
});
