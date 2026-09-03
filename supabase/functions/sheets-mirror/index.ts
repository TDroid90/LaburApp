import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedTabs = new Set(["Usuarios", "Profesionales", "Contactos", "Presupuestos", "Trabajos", "Reseñas", "Pagos", "Agenda", "Auditoría", "Tarifario", "Plantillas", "Membresías"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405, headers: corsHeaders });

  const authorization = request.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });

  const event = await request.json();
  if (!event?.id || !allowedTabs.has(event.tab) || typeof event.payload !== "object") return Response.json({ error: "invalid_event" }, { status: 400, headers: corsHeaders });

  const webhookUrl = Deno.env.get("SHEETS_WEBHOOK_URL");
  const webhookSecret = Deno.env.get("SHEETS_WEBHOOK_SECRET");
  if (!webhookUrl || !webhookSecret) return Response.json({ error: "sheets_not_configured" }, { status: 503, headers: corsHeaders });

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: webhookSecret, event: { ...event, actorUserId: user.id } }),
  });
  if (!response.ok) return Response.json({ error: "sheet_webhook_failed", status: response.status }, { status: 502, headers: corsHeaders });
  return Response.json({ ok: true, eventId: event.id }, { headers: corsHeaders });
});
