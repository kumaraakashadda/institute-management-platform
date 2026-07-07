/**
 * DatabaseSetup.gs
 * -----------------------------------------------------------------------
 * Run setupDatabase() ONCE from the Apps Script editor (see
 * DEPLOYMENT_GUIDE.md step 6) to create every tab this platform needs,
 * headers already in place — so nobody has to manually type out 30
 * sheets by hand. Safe to run again later: it never touches a sheet
 * that already exists, so it will not wipe out real data.
 * -----------------------------------------------------------------------
 */
function setupDatabase() {
  var ss = getSpreadsheet_();
  var created = [];

  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      created.push(name);
    }
    var heads = SCHEMA[name];
    sh.getRange(1, 1, 1, heads.length).setValues([heads]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, heads.length).setFontWeight('bold');
  });

  // Remove the blank "Sheet1" every new Google Sheet starts with.
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  seedDefaultSettings_();
  seedDefaultFeatureFlags_();
  seedBootstrapAdmin_();

  Logger.log('Database setup complete.');
  Logger.log('Newly created sheets: ' + (created.length ? created.join(', ') : '(none — all sheets already existed)'));
  return created;
}

/**
 * Run this ONCE after upgrading an already-live deployment to pick up new
 * columns (e.g. GPS fields) added to SCHEMA later. It only ever WIDENS a
 * sheet's header row — it never deletes a column or touches existing data
 * rows, so it is always safe to re-run.
 */
function migrateSchema_() {
  var ss = getSpreadsheet_();
  var touched = [];
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return; // brand-new table — setupDatabase() will create it
    var heads = SCHEMA[name];
    var currentWidth = Math.max(sh.getLastColumn(), 1);
    if (heads.length > currentWidth) {
      sh.getRange(1, 1, 1, heads.length).setValues([heads]);
      sh.getRange(1, 1, 1, heads.length).setFontWeight('bold');
      touched.push(name);
    }
  });
  Logger.log('Schema migration complete. Updated sheets: ' + (touched.length ? touched.join(', ') : '(none — already up to date)'));
  return touched;
}

function seedDefaultSettings_() {
  var defaults = {
    ATTENDANCE_THRESHOLD_PERCENT: '75',
    QR_EXPIRY_SECONDS: '90',
    GPS_RADIUS_METERS: '150',
    STUDENT_ID_PREFIX: 'STU',
    ADMISSION_ID_PREFIX: 'ADM',
    LATE_FEE_GRACE_DAYS: '3',
    DUE_REMINDER_DAYS_BEFORE: '3'
  };
  var existing = readAll_('Settings').map(function (r) { return r.Setting_Key; });
  Object.keys(defaults).forEach(function (key) {
    if (existing.indexOf(key) === -1) {
      appendRow_('Settings', {
        Setting_Key: key,
        Setting_Value: defaults[key],
        Description: 'Default seeded value — editable any time via the Settings API.',
        Updated_At: new Date().toISOString(),
        Updated_By: 'system'
      });
    }
  });
}

function seedDefaultFeatureFlags_() {
  var defaults = ['ATTENDANCE_MODULE', 'FEE_MODULE', 'PARENT_PORTAL', 'NOTIFICATIONS_EMAIL', 'NOTIFICATIONS_WHATSAPP', 'ENABLE_GPS_VALIDATION'];
  var existing = readAll_('Feature_Flags').map(function (r) { return r.Flag_Key; });
  defaults.forEach(function (key) {
    if (existing.indexOf(key) === -1) {
      appendRow_('Feature_Flags', {
        Flag_Key: key,
        Enabled: (key === 'ATTENDANCE_MODULE' || key === 'FEE_MODULE') ? 'TRUE' : 'FALSE',
        Description: 'Default seeded flag.',
        Updated_At: new Date().toISOString()
      });
    }
  });
}

/** Creates exactly one Super Admin login, only if the Admins sheet is
 *  completely empty, so you can access the API for the very first time.
 *  Change this password immediately after your first login. */
function seedBootstrapAdmin_() {
  var existing = readAll_('Admins');
  if (existing.length > 0) return; // never overwrite a real admin
  var salt = randomSalt_();
  var tempPassword = 'ChangeMe@123';
  appendRow_('Admins', {
    Admin_ID: 'ADM000001',
    Full_Name: 'Super Admin',
    Phone: '',
    Email: 'admin@yourinstitute.com',
    Password_Hash: hashPassword_(tempPassword, salt),
    Salt: salt,
    Status: 'Active',
    Created_At: new Date().toISOString()
  });
  Logger.log('Bootstrap Super Admin created.');
  Logger.log('  Email:    admin@yourinstitute.com');
  Logger.log('  Password: ' + tempPassword);
  Logger.log('  CHANGE THIS IMMEDIATELY after your first login.');
}
