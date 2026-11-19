/**
 * Family Lift: a tiny API that stores workout logs in this Google Sheet.
 *
 * Setup (once):
 *   1. Change FAMILY_PIN below to something only your family knows.
 *   2. Deploy > New deployment > Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *   3. Copy the web app URL (ends in /exec) into config.js in the web app.
 *
 * The web app sends every request as a POST with a JSON body:
 *   {pin, action: "list"}
 *   {pin, action: "add", entry: {p, d, ex, exName, w, unit, reps}}
 *   {pin, action: "delete", id}
 */

const FAMILY_PIN = "change-me";   // <-- change this before deploying
const SHEET_NAME = "logs";
const HEADERS = ["id", "timestamp", "date", "person", "day", "exercise_id", "exercise", "weight", "unit", "reps"];
const PEOPLE = { wife: "Moe", me: "Pyae", bro: "Htet" };

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad_request" });
  }
  if (!body || String(body.pin) !== FAMILY_PIN) {
    return json_({ ok: false, error: "wrong_pin" });
  }
  try {
    if (body.action === "list") return json_({ ok: true, logs: list_() });
    if (body.action === "add") return json_({ ok: true, entry: add_(body.entry) });
    if (body.action === "delete") return json_({ ok: true, deleted: delete_(body.id) });
    return json_({ ok: false, error: "unknown_action" });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

// A plain GET just confirms the deployment works (no data is returned).
function doGet() {
  return json_({ ok: true, service: "family-lift" });
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sh;
}

function list_() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const rows = sh.getRange(2, 1, n, HEADERS.length).getValues();
  return rows
    .filter(r => r[0])
    .map(r => ({
      id: String(r[0]),
      ts: Number(r[1]),
      p: personKey_(r[3]),
      d: String(r[4]),
      ex: String(r[5]),
      w: Number(r[7]),
      reps: String(r[9] || "")
    }))
    .filter(l => l.p && !isNaN(l.w) && !isNaN(l.ts))
    .sort((a, b) => b.ts - a.ts);
}

function add_(entry) {
  if (!entry || !PEOPLE[entry.p] || !entry.ex) throw new Error("missing_fields");
  const w = Number(entry.w);
  if (!(w >= 0) || w > 2000) throw new Error("bad_weight");
  const id = Utilities.getUuid();
  const ts = Date.now();
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const row = [
    id, ts, Utilities.formatDate(new Date(ts), tz, "yyyy-MM-dd"),
    PEOPLE[entry.p], String(entry.d || "").slice(0, 2),
    String(entry.ex).slice(0, 40), String(entry.exName || "").slice(0, 80),
    w, String(entry.unit || "").slice(0, 20), String(entry.reps || "").slice(0, 40)
  ];
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { sheet_().appendRow(row); } finally { lock.releaseLock(); }
  return { id: id, ts: ts, p: entry.p, d: row[4], ex: row[5], w: w, reps: row[9] };
}

function delete_(id) {
  if (!id) throw new Error("missing_id");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const n = sh.getLastRow() - 1;
    if (n < 1) return false;
    const ids = sh.getRange(2, 1, n, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) { sh.deleteRow(i + 2); return true; }
    }
    return false;
  } finally { lock.releaseLock(); }
}

// The sheet shows names (Moe, Pyae, Htet); the app uses short keys.
function personKey_(name) {
  for (const k in PEOPLE) if (PEOPLE[k] === String(name)) return k;
  return "";
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
