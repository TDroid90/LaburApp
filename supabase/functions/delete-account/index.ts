import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function response(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: corsHeaders });
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

  const { data: deleteAfter, error: requestError } = await admin.rpc("request_account_deletion", {
    p_user_id: user.id,
  });
  if (requestError || typeof deleteAfter !== "string") return response(500, { error: "deletion_request_failed" });

  return response(202, { requested: true, delete_after: deleteAfter });
});
