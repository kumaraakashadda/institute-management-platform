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

function seedDefaultSettings_() {
  var defaults = {
    ATTENDANCE_THRESHOLD_PERCENT: '75',
    QR_EXPIRY_SECONDS: '90',
    GPS_RADIUS_METERS: '150',
    STUDENT_ID_PREFIX: 'STU',
    ADMISSION_ID_PREFIX: 'ADM',
    LATE_FEE_GRACE_DAYS: '3',
    DUE_REMINDER_DAYS_BEFORE: '3',
    INSTITUTE_NAME: 'My Institute',
    INSTITUTE_EMAIL: 'info@myinstitute.com',
    INSTITUTE_PHONE: '',
    INSTITUTE_ADDRESS: '',
    INSTITUTE_LOGO_URL: '',
    BRAND_COLOUR: '#2563eb',
    WORKING_DAYS: 'Mon,Tue,Wed,Thu,Fri,Sat',
    MAX_DAILY_SESSIONS: '3',
    ALLOW_MULTIPLE_SESSIONS: 'TRUE',
    ATTENDANCE_LATE_THRESHOLD_MINUTES: '10',
    ENABLE_GPS_VALIDATION: 'FALSE',
    ENABLE_DEVICE_FINGERPRINT: 'FALSE',
    ENABLE_SELFIE_CAPTURE: 'FALSE',
    ENABLE_WIFI_VALIDATION: 'FALSE',
    DUPLICATE_CHECK_ON_ADMISSION: 'TRUE',
    AUTO_SEND_WELCOME_EMAIL: 'TRUE',
    FEE_RECEIPT_TEMPLATE: 'DEFAULT',
    RECEIPT_PREFIX: 'RCP',
    LATE_FEE_PERCENT: '0',
    BULK_UPLOAD_MAX_ROWS: '500',
    CERTIFICATE_HEADER_TEXT: 'This is to certify that',
    NOTIFICATION_EMAIL_FROM: '',
    WHATSAPP_API_URL: '',
    WHATSAPP_API_KEY: '',
    SMS_API_URL: '',
    SMS_API_KEY: ''
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
  var defaults = ['ATTENDANCE_MODULE', 'FEE_MODULE', 'PARENT_PORTAL', 'NOTIFICATIONS_EMAIL', 'NOTIFICATIONS_WHATSAPP'];
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
