import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const buckets = ["avatars", "profile-photos", "portfolio", "private-documents", "request-photos", "provider-credentials", "private-receipts"];

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function listFiles(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("STORAGE_LIST_FAILED");
    const rows = data ?? [];
    for (const item of rows) {
      const path = `${prefix}/${item.name}`;
      if (item.id) files.push(path);
      else files.push(...await listFiles(admin, bucket, path));
    }
    if (rows.length < 100) break;
    offset += rows.length;
  }
  return files;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return json(503, { error: "service_not_configured" });
  if (request.headers.get("Authorization") !== `Bearer ${serviceKey}`) return json(401, { error: "unauthorized" });

  let userId = "";
  try {
    const body = await request.json();
    if (typeof body.user_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.user_id)) return json(400, { error: "invalid_request" });
    userId = body.user_id;
  } catch { return json(400, { error: "invalid_request" }); }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: row, error: lookupError } = await admin.from("account_deletion_requests")
    .select("status,delete_after,reviewed_at,reviewed_by").eq("user_id", userId).maybeSingle();
  if (lookupError || !row || !["processing", "prepared"].includes(row.status)) return json(409, { error: "request_not_confirmed" });
  if (!row.reviewed_at || !row.reviewed_by) return json(409, { error: "manual_review_required" });
  if (!row.delete_after || new Date(row.delete_after).getTime() > Date.now()) return json(409, { error: "review_window_not_elapsed" });

  try {
    for (const bucket of buckets) {
      const files = await listFiles(admin, bucket, userId);
      for (let i = 0; i < files.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(files.slice(i, i + 100));
        if (error) throw new Error("STORAGE_REMOVE_FAILED");
      }
    }

    if (row.status !== "prepared") {
      const { error } = await admin.rpc("prepare_account_deletion", { p_user_id: userId });
      if (error) throw new Error("ACCOUNT_CLEANUP_FAILED");
    }
    const { error: authError } = await admin.auth.admin.deleteUser(userId, false);
    if (authError && !authError.message.toLowerCase().includes("not found")) throw new Error("AUTH_DELETE_FAILED");
    const now = new Date().toISOString();
    const { error: completeError } = await admin.from("account_deletion_requests").update({
      status: "completed", completed_at: now, last_error: null, updated_at: now,
    }).eq("user_id", userId);
    if (completeError) throw new Error("REQUEST_FINALIZE_FAILED");
    return json(200, { deleted: true });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "PROCESSING_FAILED";
    await admin.from("account_deletion_requests").update({ status: "failed", last_error: code, updated_at: new Date().toISOString() }).eq("user_id", userId);
    return json(502, { error: "deletion_processing_failed", retryable: true });
  }
});
