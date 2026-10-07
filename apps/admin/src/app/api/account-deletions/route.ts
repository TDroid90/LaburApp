import { NextRequest } from "next/server";
import { adminResponse, authorizeDeletionAdmin, supabaseAdminConfig, supabaseRequest } from "@/lib/deletion-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeletionRequest = {
  user_id: string;
  status: string;
  requested_at: string;
  delete_after: string | null;
  attempts: number;
  last_error: string | null;
};

export async function GET(request: NextRequest) {
  const auth = authorizeDeletionAdmin(request);
  if (auth.response) return auth.response;
  if (!supabaseAdminConfig()) return adminResponse({ error: "admin_not_configured" }, 503);

  const result = await supabaseRequest<DeletionRequest[]>(
    "/rest/v1/account_deletion_requests?select=user_id,status,requested_at,delete_after,attempts,last_error&status=in.(pending,failed,prepared)&order=delete_after.asc",
  );
  if (!result.ok || !result.data) return adminResponse({ error: "requests_unavailable" }, 502);
  const ids = result.data.map((item) => item.user_id);
  const names = new Map<string, string>();
  if (ids.length) {
    const query = new URLSearchParams({ select: "id,full_name", id: `in.(${ids.join(",")})` });
    const profiles = await supabaseRequest<Array<{ id: string; full_name: string | null }>>(`/rest/v1/profiles?${query}`);
    for (const profile of profiles.data ?? []) names.set(profile.id, profile.full_name || "Nombre no disponible");
  }
  return adminResponse({ requests: result.data.map((item) => ({ ...item, full_name: names.get(item.user_id) ?? "Nombre no disponible" })) });
}

export async function POST(request: NextRequest) {
  const auth = authorizeDeletionAdmin(request);
  if (auth.response) return auth.response;
  if (!supabaseAdminConfig()) return adminResponse({ error: "admin_not_configured" }, 503);

  let payload: { user_id?: unknown; action?: unknown };
  try { payload = await request.json(); } catch { return adminResponse({ error: "invalid_request" }, 400); }
  if (typeof payload.user_id !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.user_id) || !["confirm", "reject"].includes(String(payload.action))) {
    return adminResponse({ error: "invalid_request" }, 400);
  }
  const id = encodeURIComponent(payload.user_id);
  const selected = await supabaseRequest<DeletionRequest[]>(`/rest/v1/account_deletion_requests?user_id=eq.${id}&select=user_id,status,requested_at,delete_after,attempts,last_error`);
  const item = selected.data?.[0];
  if (!selected.ok || !item || !["pending", "failed", "prepared"].includes(item.status)) return adminResponse({ error: "request_not_pending" }, 409);

  if (payload.action === "reject") {
    const cancelled = await supabaseRequest<boolean>("/rest/v1/rpc/cancel_account_deletion", {
      method: "POST", body: JSON.stringify({ p_user_id: item.user_id, p_reviewed_by: auth.username }),
    });
    if (!cancelled.ok || cancelled.data !== true) return adminResponse({ error: "request_update_failed" }, 409);
    return adminResponse({ ok: true, action: "rejected" });
  }

  if (!item.delete_after || new Date(item.delete_after).getTime() > Date.now()) {
    return adminResponse({ error: "review_window_not_elapsed", delete_after: item.delete_after }, 409);
  }
  const config = supabaseAdminConfig()!;
  const now = new Date().toISOString();
  const reviewed = await supabaseRequest<DeletionRequest[]>(`/rest/v1/account_deletion_requests?user_id=eq.${id}&status=eq.${item.status}&delete_after=lte.${encodeURIComponent(now)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "processing", reviewed_at: now, reviewed_by: auth.username, attempts: item.attempts + 1, updated_at: now }),
  });
  if (!reviewed.ok || !reviewed.data?.length) return adminResponse({ error: "request_already_changed" }, 409);

  try {
    const response = await fetch(`${config.url}/functions/v1/process-account-deletion`, {
      method: "POST",
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: item.user_id }),
      cache: "no-store",
    });
    if (!response.ok) {
      await supabaseRequest(`/rest/v1/account_deletion_requests?user_id=eq.${id}&status=eq.processing`, {
        method: "PATCH", body: JSON.stringify({ status: "failed", last_error: "PROCESSING_FAILED", updated_at: new Date().toISOString() }),
      });
      return adminResponse({ error: "deletion_processing_failed" }, 502);
    }
    return adminResponse({ ok: true, action: "confirmed" });
  } catch {
    await supabaseRequest(`/rest/v1/account_deletion_requests?user_id=eq.${id}&status=eq.processing`, {
      method: "PATCH", body: JSON.stringify({ status: "failed", last_error: "PROCESSING_FAILED", updated_at: new Date().toISOString() }),
    });
    return adminResponse({ error: "deletion_processing_failed" }, 502);
  }
}
