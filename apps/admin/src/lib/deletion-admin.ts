import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export function authorizeDeletionAdmin(request: NextRequest) {
  const expectedUser = process.env.ADMIN_BASIC_USER;
  const expectedPassword = process.env.ADMIN_BASIC_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    return { response: NextResponse.json({ error: "admin_not_configured" }, { status: 503 }) };
  }

  const value = request.headers.get("authorization") ?? "";
  let suppliedUser = "";
  let suppliedPassword = "";
  try {
    if (!value.startsWith("Basic ")) throw new Error("missing_basic_auth");
    const decoded = Buffer.from(value.slice(6), "base64").toString("utf8");
    const split = decoded.indexOf(":");
    if (split < 0) throw new Error("invalid_basic_auth");
    suppliedUser = decoded.slice(0, split);
    suppliedPassword = decoded.slice(split + 1);
  } catch {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  const equal = (actual: string, expected: string) => {
    const a = Buffer.from(actual);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  if (!equal(suppliedUser, expectedUser) || !equal(suppliedPassword, expectedPassword)) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { username: suppliedUser };
}

export function supabaseAdminConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function adminResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<{ data: T | null; ok: boolean }> {
  const config = supabaseAdminConfig();
  if (!config) return { data: null, ok: false };
  try {
    const response = await fetch(`${config.url}${path}`, {
      ...init,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...init?.headers,
      },
      cache: "no-store",
    });
    return { data: response.ok ? await response.json() as T : null, ok: response.ok };
  } catch {
    return { data: null, ok: false };
  }
}
