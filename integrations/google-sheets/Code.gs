const TAB_HEADERS = {
  Usuarios: ["event_id", "fecha", "user_id", "nombre", "email", "rol", "ciudad", "estado", "origen"],
  Profesionales: ["professional_id", "fecha_alta", "user_id", "nombre", "email", "oficio", "ciudad", "estrellas", "trabajos_completados", "verificado", "disponibilidad", "bio"],
  Contactos: ["event_id", "fecha", "request_id", "cliente", "cliente_email", "profesional", "oficio", "canal", "estado", "descripcion"],
  Presupuestos: ["event_id", "fecha", "request_id", "profesional", "oficio", "version", "modalidad", "total_ars", "alcance", "plazo", "vigencia_dias", "observaciones", "items_json"],
  Trabajos: ["job_id", "fecha", "request_id", "cliente", "profesional", "oficio", "estado", "total_ars", "inicio", "finalizacion", "pago_estado"],
  Reseñas: ["review_id", "fecha", "job_id", "cliente", "profesional", "estrellas", "comentario", "verificada", "moderacion"],
  Pagos: ["payment_id", "fecha", "job_id", "proveedor_pago", "estado", "moneda", "total", "comision", "neto_profesional", "referencia_externa"],
  Agenda: ["agenda_id", "profesional_id", "fecha", "desde", "hasta", "estado", "request_id", "zona", "notas"],
  Auditoría: ["audit_id", "fecha", "actor_id", "accion", "entidad", "entidad_id", "motivo", "antes_json", "despues_json"],
};

function setupLaburAppMirror() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  Object.entries(TAB_HEADERS).forEach(([name, headers]) => {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#EAEAEA").setFontColor("#151515").setFontWeight("bold");
    if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter();
    sheet.autoResizeColumns(1, headers.length);
  });
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", spreadsheet.getId());
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
    if (!expectedSecret || body.secret !== expectedSecret) return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    const event = body.event || {};
    if (!TAB_HEADERS[event.tab]) return jsonResponse({ ok: false, error: "invalid_tab" }, 400);

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(event.tab);
    const duplicate = sheet.getLastRow() > 1 && sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(String(event.id)).matchEntireCell(true).findNext();
    if (duplicate) return jsonResponse({ ok: true, eventId: event.id, duplicate: true });
    const payload = event.payload || {};
    const rows = {
      Usuarios: [event.id, event.occurredAt, event.actorUserId || "", payload.user_name || "", payload.email || "", payload.role || "", payload.city || "", payload.status || "registrado", payload.source || ""],
      Profesionales: [payload.id || event.id, payload.created_at || event.occurredAt, payload.user_id || event.actorUserId || "", payload.full_name || payload.user_name || "", payload.email || "", payload.trade_title || payload.trade || "", payload.city || "", payload.rating || "", payload.completed_jobs || 0, payload.verified || "", payload.availability || "", payload.bio || ""],
      Contactos: [event.id, event.occurredAt, payload.request_id || "", payload.client_name || "", payload.client_email || "", payload.provider_name || "", payload.trade || "", payload.channel || "", payload.status || "", payload.description || ""],
      Presupuestos: [event.id, event.occurredAt, payload.request_id || "", payload.provider_name || "", payload.trade || "", payload.version || "", payload.pricing_mode || "", payload.amount_ars || 0, payload.scope || "", payload.eta || "", payload.valid_days || "", payload.notes || "", payload.items_json || "[]"],
      Trabajos: [payload.id || event.id, payload.created_at || event.occurredAt, payload.request_id || "", payload.client_id || "", payload.provider_id || "", payload.trade || "", payload.status || "", payload.total || "", payload.started_at || "", payload.completed_at || "", payload.payment_status || ""],
      Reseñas: [payload.id || event.id, payload.created_at || event.occurredAt, payload.job_id || "", payload.client_id || "", payload.provider_id || "", payload.rating || "", payload.comment || "", payload.verified || true, payload.moderated_at || ""],
      Pagos: [payload.id || event.id, payload.created_at || event.occurredAt, payload.job_id || "", payload.provider || "", payload.status || "", payload.currency || "ARS", payload.total || 0, payload.fee_amount || "", payload.provider_net || "", payload.provider_event_id || ""],
      Agenda: [payload.id || event.id, payload.provider_id || "", payload.created_at || event.occurredAt, payload.starts_at || "", payload.ends_at || "", payload.status || "", payload.request_id || "", payload.approximate_zone || "", payload.notes || ""],
      Auditoría: [payload.id || event.id, payload.created_at || event.occurredAt, payload.actor_id || "", payload.action || "", payload.target_type || "", payload.target_id || "", payload.reason || "", JSON.stringify(payload.before_data || {}), JSON.stringify(payload.after_data || {})],
    };
    sheet.appendRow(rows[event.tab].map(safeCell));
    return jsonResponse({ ok: true, eventId: event.id }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function safeCell(value) {
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
