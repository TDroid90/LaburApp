const TAB_HEADERS = {
  Usuarios: ["event_id", "fecha", "user_id", "nombre", "email", "rol", "ciudad", "estado", "origen"],
  Contactos: ["event_id", "fecha", "request_id", "cliente", "cliente_email", "profesional", "oficio", "canal", "estado", "descripcion"],
  Presupuestos: ["event_id", "fecha", "request_id", "profesional", "oficio", "version", "modalidad", "total_ars", "alcance", "plazo", "vigencia_dias", "observaciones", "items_json"],
};

function setupLaburAppMirror() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  Object.entries(TAB_HEADERS).forEach(([name, headers]) => {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#063C78").setFontColor("#FFFFFF").setFontWeight("bold");
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
      Contactos: [event.id, event.occurredAt, payload.request_id || "", payload.client_name || "", payload.client_email || "", payload.provider_name || "", payload.trade || "", payload.channel || "", payload.status || "", payload.description || ""],
      Presupuestos: [event.id, event.occurredAt, payload.request_id || "", payload.provider_name || "", payload.trade || "", payload.version || "", payload.pricing_mode || "", payload.amount_ars || 0, payload.scope || "", payload.eta || "", payload.valid_days || "", payload.notes || "", payload.items_json || "[]"],
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
