function respond(res, status, body) {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  return res.status(status).json(body);
}

function serviceHeaders(key, bearer = key) {
  return { apikey: key, authorization: `Bearer ${bearer}` };
}

async function requireAdmin(req, supabaseUrl, publicKey, serviceKey) {
  const authorization = String(req.headers.authorization ?? "");
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: serviceHeaders(publicKey, token) });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  const roleResponse = await fetch(
    `${supabaseUrl}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&limit=1`,
    { headers: serviceHeaders(serviceKey) },
  );
  if (!roleResponse.ok) return null;
  const roles = await roleResponse.json();
  return roles.length ? user : null;
}

function restUrl(baseUrl, table, params = {}) {
  const search = new URLSearchParams({ select: "*", ...params });
  return `${baseUrl}/rest/v1/${table}?${search.toString()}`;
}

async function exactCount(baseUrl, serviceKey, table, params = {}) {
  const response = await fetch(restUrl(baseUrl, table, params), {
    method: "HEAD",
    headers: { ...serviceHeaders(serviceKey), prefer: "count=exact" },
  });
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
  const match = String(response.headers.get("content-range") ?? "").match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function allRows(baseUrl, serviceKey, table, select, params = {}) {
  const rows = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const search = new URLSearchParams({ select, ...params });
    const response = await fetch(`${baseUrl}/rest/v1/${table}?${search.toString()}`, {
      headers: { ...serviceHeaders(serviceKey), range: `${start}-${start + pageSize - 1}` },
    });
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return respond(res, 405, { error: "Método no permitido." });
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !publicKey || !serviceKey) return respond(res, 503, { error: "Métricas no configuradas." });
  if (!await requireAdmin(req, supabaseUrl, publicKey, serviceKey)) return respond(res, 403, { error: "Acceso administrativo requerido." });

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [
      usersTotal, usersActive, usersNew30, providersTotal, providersPublished,
      requests, requests30, cancelledRequests, quotes, quotes30,
      jobs, jobs30, completedJobs,
      profiles, providerRows, clientPaid, providerPaid, ratings, verifiedRows,
    ] = await Promise.all([
      exactCount(supabaseUrl, serviceKey, "profiles"),
      exactCount(supabaseUrl, serviceKey, "profiles", { account_status: "eq.active" }),
      exactCount(supabaseUrl, serviceKey, "profiles", { created_at: `gte.${since}` }),
      exactCount(supabaseUrl, serviceKey, "provider_profiles"),
      exactCount(supabaseUrl, serviceKey, "provider_profiles", { published: "eq.true" }),
      exactCount(supabaseUrl, serviceKey, "service_requests"),
      exactCount(supabaseUrl, serviceKey, "service_requests", { created_at: `gte.${since}` }),
      exactCount(supabaseUrl, serviceKey, "service_requests", { status: "eq.cancelled" }),
      exactCount(supabaseUrl, serviceKey, "quotes"),
      exactCount(supabaseUrl, serviceKey, "quotes", { created_at: `gte.${since}` }),
      exactCount(supabaseUrl, serviceKey, "jobs"),
      exactCount(supabaseUrl, serviceKey, "jobs", { created_at: `gte.${since}` }),
      exactCount(supabaseUrl, serviceKey, "jobs", { status: "in.(completed,funds_released)" }),
      allRows(supabaseUrl, serviceKey, "profiles", "id,city"),
      allRows(supabaseUrl, serviceKey, "provider_profiles", "user_id"),
      allRows(supabaseUrl, serviceKey, "client_memberships", "client_id", { plan_code: "neq.free", status: "in.(active,trialing)" }),
      allRows(supabaseUrl, serviceKey, "provider_memberships", "provider_id", { plan_code: "neq.free", status: "in.(active,trialing)" }),
      allRows(supabaseUrl, serviceKey, "reviews", "rating"),
      allRows(supabaseUrl, serviceKey, "credentials", "provider_id", { status: "eq.verified" }),
    ]);

    const providerIds = new Set(providerRows.map((row) => String(row.user_id)));
    const subscriberIds = new Set([...clientPaid.map((row) => String(row.client_id)), ...providerPaid.map((row) => String(row.provider_id))]);
    const citiesMap = new Map();
    for (const profile of profiles) {
      const city = String(profile.city || "Sin ciudad");
      const current = citiesMap.get(city) ?? { city, users: 0, providers: 0 };
      current.users += 1;
      if (providerIds.has(String(profile.id))) current.providers += 1;
      citiesMap.set(city, current);
    }
    const averageRating = ratings.length
      ? Math.round((ratings.reduce((sum, row) => sum + Number(row.rating || 0), 0) / ratings.length) * 10) / 10
      : 0;

    return respond(res, 200, {
      generated_at: new Date().toISOString(),
      users: {
        total: usersTotal,
        clients: Math.max(usersTotal - providersTotal, 0),
        providers: providersTotal,
        active: usersActive,
        new_30d: usersNew30,
        published_providers: providersPublished,
        verified_providers: new Set(verifiedRows.map((row) => String(row.provider_id))).size,
      },
      subscriptions: { total: subscriberIds.size, clients: clientPaid.length, providers: providerPaid.length },
      activity: {
        requests,
        requests_30d: requests30,
        cancelled_requests: cancelledRequests,
        quotes,
        quotes_30d: quotes30,
        jobs,
        jobs_30d: jobs30,
        completed_jobs: completedJobs,
      },
      quality: { reviews: ratings.length, average_rating: averageRating },
      cities: [...citiesMap.values()].sort((a, b) => b.users - a.users || a.city.localeCompare(b.city)),
    });
  } catch {
    return respond(res, 502, { error: "No pudimos leer las métricas reales de la base." });
  }
}
