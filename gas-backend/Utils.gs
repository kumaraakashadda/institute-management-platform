/**
 * Utils.gs
 * -----------------------------------------------------------------------
 * Generic helpers shared by every module. This is the "repository
 * pattern" layer — nothing else in the codebase talks to Google Sheets
 * directly, it always goes through these functions.
 * -----------------------------------------------------------------------
 */

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) { return jsonOut_({ success: true, data: data }); }
function fail_(message, code) { return jsonOut_({ success: false, error: message, code: code || 'ERROR' }); }

function sheet_(name) {
  var sh = getSpreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" does not exist yet. Run setupDatabase() first.');
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

/** Reads every data row of a sheet as an array of plain objects keyed by header.
 *  Each object also carries a hidden _row (1-indexed sheet row) so updates
 *  and deletes know exactly which row to touch. */
function readAll_(name) {
  var sh = sheet_(name);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var heads = headers_(sh);
  var values = sh.getRange(2, 1, lastRow - 1, heads.length).getValues();
  return values.map(function (row, i) {
    var obj = {};
    heads.forEach(function (h, j) { obj[h] = row[j]; });
    obj._row = i + 2;
    return obj;
  });
}

/** Finds the first row where `column` equals `value`. */
function findOne_(name, column, value) {
  var rows = readAll_(name);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][column]) === String(value)) return rows[i];
  }
  return null;
}

/** Appends one object as a new row. Missing fields are written as ''. */
function appendRow_(name, obj) {
  var sh = sheet_(name);
  var heads = headers_(sh);
  var row = heads.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sh.appendRow(row);
  return obj;
}

/** Overwrites one existing row (by sheet row number) with new field values,
 *  keeping any column not present in `patch` unchanged. */
function updateRow_(name, rowNumber, patch) {
  var sh = sheet_(name);
  var heads = headers_(sh);
  var current = sh.getRange(rowNumber, 1, 1, heads.length).getValues()[0];
  var updated = heads.map(function (h, i) {
    return patch[h] !== undefined ? patch[h] : current[i];
  });
  sh.getRange(rowNumber, 1, 1, heads.length).setValues([updated]);
  var obj = {};
  heads.forEach(function (h, i) { obj[h] = updated[i]; });
  return obj;
}

/** Soft-delete: sets Status = 'Deleted' instead of removing the row, so
 *  historical references (attendance, fees, audit trail) never dangle. */
function softDeleteRow_(name, rowNumber) {
  var sh = sheet_(name);
  var heads = headers_(sh);
  var statusCol = heads.indexOf('Status') + 1;
  if (statusCol > 0) sh.getRange(rowNumber, statusCol).setValue('Deleted');
  return true;
}

/** Runs fn() while holding the script lock, so two simultaneous requests
 *  (e.g. two admissions saved at the same second) can never corrupt data
 *  or hand out the same ID twice. */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** Generates sequential, human-readable IDs, e.g. STU000001.
 *  Always call this from inside withLock_ (every caller in this codebase does). */
function nextId_(name, prefix, idColumn) {
  var rows = readAll_(name);
  var max = 0;
  rows.forEach(function (r) {
    var id = String(r[idColumn] || '');
    var num = parseInt(id.replace(prefix, ''), 10);
    if (!isNaN(num) && num > max) max = num;
  });
  var next = max + 1;
  return prefix + ('000000' + next).slice(-6);
}

function logAudit_(userId, role, action, tableName, recordId, oldValue, newValue, ip) {
  try {
    appendRow_('Audit_Log', {
      Audit_ID: Utilities.getUuid(),
      User_ID: userId || '',
      Role: role || '',
      Action: action,
      Table_Name: tableName,
      Record_ID: recordId,
      Old_Value: oldValue ? JSON.stringify(oldValue) : '',
      New_Value: newValue ? JSON.stringify(newValue) : '',
      Timestamp: new Date().toISOString(),
      IP: ip || ''
    });
  } catch (e) {
    logSystem_('ERROR', 'Audit log failed: ' + e.message, 'logAudit_');
  }
}

function logSystem_(level, message, source) {
  try {
    appendRow_('System_Logs', {
      Log_ID: Utilities.getUuid(),
      Level: level,
      Message: message,
      Source: source || '',
      Timestamp: new Date().toISOString()
    });
  } catch (e) {
    // Last resort — nothing else to fall back on.
  }
}
