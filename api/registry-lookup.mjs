function respond(res, status, body) {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  return res.status(status).json(body);
}

function serviceHeaders(key, bearer = key) {
  return { apikey: key, authorization: `Bearer ${bearer}` };
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanCell(value) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function tableRows(html) {
  return [...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => cleanCell(cell[1])))
    .filter((cells) => cells.length >= 3);
}

const sources = {
  dpe: {
    label: "DPE Ushuaia",
    url: "https://www.dpe.com.ar/matriculados/padron/",
    select: (cells) => ({
      matricula: cells[0] ?? "",
      categoria: cells[1] ?? "",
      alcance: cells[2] ?? "",
      nombre: cells[3] ?? "",
      dni: cells[4] ?? "",
      vigencia: cells[5] ?? "",
    }),
  },
  cooprg: {
    label: "Cooperativa Eléctrica de Río Grande",
    url: "https://www.cooprg.org.ar/clientes/matriculados/listado-de-matriculados/",
    select: (cells) => ({
      matricula: cells[0] ?? "",
      categoria: cells[1] ?? "",
      nombre: cells[2] ?? "",
      titulo: cells[5] ?? "",
      incumbencia: cells[6] ?? "",
    }),
  },
};

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

export default async function handler(req, res) {
  if (req.method !== "GET") return respond(res, 405, { error: "Método no permitido." });
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !publicKey || !serviceKey) return respond(res, 503, { error: "Verificación no configurada." });
  if (!await requireAdmin(req, supabaseUrl, publicKey, serviceKey)) return respond(res, 403, { error: "Acceso administrativo requerido." });

  const sourceKey = String(req.query?.source ?? "").toLowerCase();
  const query = String(req.query?.query ?? "").trim().slice(0, 60);
  if (query.length < 2) return respond(res, 400, { error: "Ingresá apellido, DNI o matrícula." });

  if (sourceKey === "camuzzi") {
    return respond(res, 200, {
      source: "Camuzzi Gas",
      officialUrl: "https://www.camuzzigas.com/guia-de-tramites/gasistas-matriculados/",
      status: "manual_required",
      matches: [],
      note: "Camuzzi no publica una API estable. Abrí el padrón oficial y corroborá allí la matrícula.",
    });
  }

  const source = sources[sourceKey];
  if (!source) return respond(res, 400, { error: "Padrón desconocido." });

  try {
    const response = await fetch(source.url, {
      headers: { "user-agent": "LaburApp credential verification/0.9" },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const queryNormalized = normalize(query);
    const matches = tableRows(await response.text())
      .filter((cells) => normalize(cells.join(" ")).includes(queryNormalized))
      .slice(0, 10)
      .map(source.select);
    return respond(res, 200, {
      source: source.label,
      officialUrl: source.url,
      status: matches.length ? "matched" : "not_found",
      matches,
      checkedAt: new Date().toISOString(),
      note: "Coincidencia asistida sobre el padrón público. La aprobación requiere revisión humana.",
    });
  } catch {
    return respond(res, 502, {
      source: source.label,
      officialUrl: source.url,
      status: "manual_required",
      matches: [],
      error: "El padrón oficial no respondió. Abrilo y verificá manualmente.",
    });
  }
}
