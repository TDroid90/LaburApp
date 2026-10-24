const EARLY_ACCESS_SHEET_ID = "1f49Dtq82hUBdroy3TqMfwcMxmpSG9nU1r8mxomViMmM";
const EARLY_ACCESS_TAB = "Seguimiento";
const EARLY_ACCESS_FIRST_ROW = 9;
const EARLY_ACCESS_API = "https://laburapp.work/api/early-access-feed";

function syncEarlyAccess() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const secret = PropertiesService.getScriptProperties().getProperty("EARLY_ACCESS_SYNC_SECRET");
    if (!secret) throw new Error("Falta EARLY_ACCESS_SYNC_SECRET en las propiedades del proyecto.");

    const sheet = SpreadsheetApp.openById(EARLY_ACCESS_SHEET_ID).getSheetByName(EARLY_ACCESS_TAB);
    if (!sheet) throw new Error("No existe la pestaña Seguimiento.");

    const lastRow = Math.max(EARLY_ACCESS_FIRST_ROW - 1, sheet.getLastRow());
    const existing = lastRow >= EARLY_ACCESS_FIRST_ROW
      ? sheet.getRange(EARLY_ACCESS_FIRST_ROW, 1, lastRow - EARLY_ACCESS_FIRST_ROW + 1, 2).getValues()
      : [];
    const known = new Set(existing.map((row) => String(row[0] || "").trim().toLowerCase()).filter(Boolean));
    const additions = [];
    let offset = 0;

    do {
      const response = UrlFetchApp.fetch(EARLY_ACCESS_API + "?offset=" + offset, {
        method: "get",
        headers: { Authorization: "Bearer " + secret },
        muteHttpExceptions: true,
      });
      if (response.getResponseCode() !== 200) {
        throw new Error("LaburApp devolvió " + response.getResponseCode() + " al consultar solicitudes.");
      }
      const data = JSON.parse(response.getContentText());
      if (!Array.isArray(data.requests)) throw new Error("La respuesta no contiene solicitudes válidas.");
      data.requests.forEach((request) => {
        const email = String(request.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || known.has(email)) return;
        known.add(email);
        const name = String(request.name || "").trim().replace(/^[=+\-@]/, "'$&");
        additions.push([email, name, "Pendiente", "", "Pendiente", "", "No", "Sin completar", "No iniciada", "No"]);
      });
      offset = data.nextOffset;
    } while (offset !== null && offset !== undefined);

    if (additions.length) {
      const firstNewRow = Math.max(EARLY_ACCESS_FIRST_ROW, sheet.getLastRow() + 1);
      sheet.getRange(firstNewRow, 1, additions.length, 10).setValues(additions);
    }
    PropertiesService.getScriptProperties().setProperties({
      EARLY_ACCESS_LAST_SYNC: new Date().toISOString(),
      EARLY_ACCESS_LAST_ADDED: String(additions.length),
    });
  } finally {
    lock.releaseLock();
  }
}

function installEarlyAccessSync() {
  const installed = ScriptApp.getProjectTriggers().some((trigger) => trigger.getHandlerFunction() === "syncEarlyAccess");
  if (!installed) ScriptApp.newTrigger("syncEarlyAccess").timeBased().everyMinutes(5).create();
  syncEarlyAccess();
}
