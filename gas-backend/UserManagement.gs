/**
 * UserManagement.gs
 * -----------------------------------------------------------------------
 * login_() works across all seven roles from one function. CRUD for
 * staff accounts (Teachers, Managers, Regional Managers, Counsellors) is
 * Super-Admin-only. Student accounts are NOT created here — they're
 * created automatically by AdmissionSync.gs, because Admission_Master
 * is the source of truth for students.
 * -----------------------------------------------------------------------
 */

var STAFF_TABLES = {
  ADMIN:      { table: 'Admins',             idCol: 'Admin_ID',      prefix: 'ADM', role: ROLES.SUPER_ADMIN },
  RM:         { table: 'Regional_Managers',  idCol: 'RM_ID',         prefix: 'RM',  role: ROLES.REGIONAL_MANAGER },
  MANAGER:    { table: 'Managers',           idCol: 'Manager_ID',    prefix: 'MGR', role: ROLES.CENTRE_MANAGER },
  TEACHER:    { table: 'Teachers',           idCol: 'Teacher_ID',    prefix: 'TCH', role: ROLES.TEACHER },
  COUNSELLOR: { table: 'Counsellors',        idCol: 'Counsellor_ID', prefix: 'CNS', role: ROLES.COUNSELLOR },
  PARENT:     { table: 'Parents',            idCol: 'Parent_ID',     prefix: 'PAR', role: ROLES.PARENT }
};

/** Tries every staff table by Email or Phone, then falls back to Students
 *  (matched by Portal_Username, Email, or Phone). Returns a signed JWT. */
function login_(identifier, password) {
  if (!identifier || !password) throw new Error('Email/phone and password are both required.');

  var found = null, role = null, idCol = null, table = null;

  for (var key in STAFF_TABLES) {
    var cfg = STAFF_TABLES[key];
    var row = findOne_(cfg.table, 'Email', identifier) || findOne_(cfg.table, 'Phone', identifier);
    if (row && row.Status === 'Active') { found = row; role = cfg.role; idCol = cfg.idCol; table = cfg.table; break; }
  }
  if (!found) {
    var stu = findOne_('Students', 'Portal_Username', identifier)
      || findOne_('Students', 'Email', identifier)
      || findOne_('Students', 'Phone', identifier);
    if (stu && stu.Status === 'Active') { found = stu; role = ROLES.STUDENT; idCol = 'Student_ID'; table = 'Students'; }
  }
  if (!found) throw new Error('No active account found for that email/phone.');
  if (!verifyPassword_(password, found.Salt, found.Password_Hash)) {
    throw new Error('Incorrect password.');
  }

  var token = signJwt_({
    sub: found[idCol],
    role: role,
    name: found.Full_Name,
    centre: found.Centre || ''
  }, 8 * 3600); // 8-hour session

  logAudit_(found[idCol], role, 'LOGIN', table, found[idCol], null, null);

  return {
    token: token,
    role: role,
    id: found[idCol],
    name: found.Full_Name,
    mustResetPassword: found.Must_Reset_Password === true || found.Must_Reset_Password === 'TRUE'
  };
}

/** Super Admin creates a staff account (Teacher / Manager / RM / Counsellor). */
function createStaff_(staffType, fields, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN]);
  var cfg = STAFF_TABLES[staffType];
  if (!cfg) throw new Error('Unknown staff type: ' + staffType);

  return withLock_(function () {
    var id = nextId_(cfg.table, cfg.prefix, cfg.idCol);
    var salt = randomSalt_();
    var tempPassword = fields.password || generateTempPassword_();
    var record = Object.assign({}, fields);
    delete record.password;
    record[cfg.idCol] = id;
    record.Password_Hash = hashPassword_(tempPassword, salt);
    record.Salt = salt;
    record.Status = record.Status || 'Active';
    record.Created_At = new Date().toISOString();
    appendRow_(cfg.table, record);
    logAudit_(actor.sub, actor.role, 'CREATE', cfg.table, id, null, { id: id, name: fields.Full_Name });
    return { id: id, tempPassword: tempPassword };
  });
}

function generateTempPassword_() {
  return 'Welcome@' + Math.floor(1000 + Math.random() * 9000);
}

/** Any logged-in user changes their own password. */
function changePassword_(actor, oldPassword, newPassword) {
  var cfgEntry = null;
  for (var key in STAFF_TABLES) {
    if (STAFF_TABLES[key].role === actor.role) { cfgEntry = STAFF_TABLES[key]; break; }
  }
  var table = cfgEntry ? cfgEntry.table : 'Students';
  var idCol = cfgEntry ? cfgEntry.idCol : 'Student_ID';

  return withLock_(function () {
    var row = findOne_(table, idCol, actor.sub);
    if (!row) throw new Error('Account not found.');
    if (!verifyPassword_(oldPassword, row.Salt, row.Password_Hash)) throw new Error('Current password is incorrect.');
    var salt = randomSalt_();
    var patch = { Password_Hash: hashPassword_(newPassword, salt), Salt: salt };
    if (table === 'Students') patch.Must_Reset_Password = false;
    updateRow_(table, row._row, patch);
    logAudit_(actor.sub, actor.role, 'PASSWORD_CHANGE', table, actor.sub, null, null);
    return true;
  });
}
