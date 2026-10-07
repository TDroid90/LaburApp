import { NextRequest } from "next/server";
import { adminResponse, authorizeDeletionAdmin, supabaseAdminConfig, supabaseRequest } from "@/lib/deletion-admin";

type Review = { id: string; job_id: string; client_id: string; provider_id: string; rating: number; comment: string | null; moderated_at: string | null; created_at: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const auth = authorizeDeletionAdmin(request);
  if (auth.response) return auth.response;
  if (!supabaseAdminConfig()) return adminResponse({ error: "admin_not_configured" }, 503);
  const result = await supabaseRequest<Review[]>("/rest/v1/reviews?select=id,job_id,client_id,provider_id,rating,comment,moderated_at,created_at&order=created_at.desc&limit=100");
  if (!result.ok) return adminResponse({ error: "reviews_unavailable" }, 502);
  const reviews = result.data ?? [];
  const ids = [...new Set(reviews.flatMap((review) => [review.client_id, review.provider_id]))];
  const profiles = ids.length ? await supabaseRequest<Array<{ id: string; full_name: string }>>(`/rest/v1/profiles?select=id,full_name&id=in.(${ids.join(",")})`) : null;
  const names = new Map((profiles?.data ?? []).map((profile) => [profile.id, profile.full_name]));
  return adminResponse({ reviews: reviews.map((review) => ({ ...review, client_name: names.get(review.client_id) ?? "Cuenta no disponible", provider_name: names.get(review.provider_id) ?? "Cuenta no disponible" })) });
}

export async function POST(request: NextRequest) {
  const auth = authorizeDeletionAdmin(request);
  if (auth.response) return auth.response;
  if (!supabaseAdminConfig()) return adminResponse({ error: "admin_not_configured" }, 503);
  const origin = request.headers.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== request.nextUrl.host) return adminResponse({ error: "invalid_origin" }, 403); }
    catch { return adminResponse({ error: "invalid_origin" }, 403); }
  }
  let body: { id?: string; action?: string };
  try { body = await request.json(); } catch { return adminResponse({ error: "invalid_request" }, 400); }
  if (!body.id || !uuid.test(body.id) || !["hide", "restore", "delete"].includes(body.action ?? "")) return adminResponse({ error: "invalid_request" }, 400);
  const path = `/rest/v1/reviews?id=eq.${body.id}`;
  const current = await supabaseRequest<Review[]>(`${path}&select=id,job_id,client_id,provider_id,rating,comment,moderated_at,created_at`);
  if (!current.ok) return adminResponse({ error: "reviews_unavailable" }, 502);
  if (!current.data?.length) return adminResponse({ error: "review_not_found" }, 404);
  const action = body.action;
  const result = await supabaseRequest<Review[]>(path, action === "delete"
    ? { method: "DELETE" }
    : { method: "PATCH", body: JSON.stringify({ moderated_at: action === "hide" ? new Date().toISOString() : null }) });
  if (!result.ok || !result.data?.length) return adminResponse({ error: "review_update_failed" }, 502);
  return adminResponse({ ok: true });
}
