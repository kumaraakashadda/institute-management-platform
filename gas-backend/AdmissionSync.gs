/**
 * AdmissionSync.gs
 * -----------------------------------------------------------------------
 * Admission_Master is the single Source of Truth. createAdmission_() is
 * the ONE function that turns a new admission into a fully working
 * student — portal account, batch/centre/course/target-year/segment
 * assignment, a Student ID, and a signed QR identity — automatically,
 * with zero manual follow-up steps. If a parent's details are supplied,
 * a linked Parent account is created too.
 * -----------------------------------------------------------------------
 */
/**
 * bulkUploadAdmissions_
 * -----------------------------------------------------------------------
 * Accepts an array of row objects (already parsed from CSV/Excel by the
 * frontend) and calls createAdmission_() for each one individually so
 * every row gets the full auto-creation pipeline (student account, parent
 * account, QR identity, etc.).
 *
 * Returns a per-row result array so the UI can show exactly which rows
 * succeeded and which failed, with the error message.
 *
 * Limits: max 500 rows per call to stay inside GAS's 6-minute
 * execution limit (~0.7 s per row worst case).
 */
function bulkUploadAdmissions_(rows, actor) {
  requireRole_(actor, ADMISSION_CREATE_ROLES);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No rows provided.');
  if (rows.length > 500) throw new Error('Maximum 500 rows per upload. Split the file and try again.');

  var results = [];
  var successCount = 0;
  var errorCount   = 0;

  rows.forEach(function(row, idx) {
    try {
      var result = createAdmission_(row, actor);
      results.push({
        row: idx + 2, // 1-indexed, +1 for header
        status: 'success',
        admission_id: result.admissionId,
        student_id:   result.studentId,
        name:         row.Full_Name || '',
        phone:        row.Phone || '',
        temp_password: result.studentTempPassword,
      });
      successCount++;
    } catch(e) {
      results.push({
        row:    idx + 2,
        status: 'error',
        name:   row.Full_Name || '(row ' + (idx+2) + ')',
        phone:  row.Phone || '',
        error:  e.message,
      });
      errorCount++;
    }
  });

  logAudit_(actor.sub, actor.role, 'BULK_UPLOAD_ADMISSIONS', 'Admission_Master', 'bulk',
    null, { total: rows.length, success: successCount, errors: errorCount });

  return { total: rows.length, success: successCount, errors: errorCount, results: results };
}

/**
 * bulkUploadStaff_
 * -----------------------------------------------------------------------
 * Creates multiple teacher / counsellor / manager accounts in one call.
 * staffType: 'Teacher' | 'Counsellor' | 'Manager' | 'Regional_Manager'
 */
function bulkUploadStaff_(staffType, rows, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER]);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No rows provided.');
  if (rows.length > 200) throw new Error('Maximum 200 rows per staff upload.');

  var results = [];
  var successCount = 0;
  var errorCount   = 0;

  rows.forEach(function(row, idx) {
    try {
      var result = createStaff_(staffType, row, actor);
      results.push({ row: idx + 2, status: 'success', id: result.id, name: row.Full_Name || '', phone: row.Phone || '', temp_password: result.tempPassword });
      successCount++;
    } catch(e) {
      results.push({ row: idx + 2, status: 'error', name: row.Full_Name || '(row ' + (idx+2) + ')', phone: row.Phone || '', error: e.message });
      errorCount++;
    }
  });

  logAudit_(actor.sub, actor.role, 'BULK_UPLOAD_STAFF', staffType, 'bulk', null, { total: rows.length, success: successCount, errors: errorCount });
  return { total: rows.length, success: successCount, errors: errorCount, results: results };
}

/**
 * getBulkUploadHistory_
 * -----------------------------------------------------------------------
 * Returns recent bulk upload audit log entries so admins can see what
 * was uploaded, by whom, and when.
 */
function getBulkUploadHistory_(actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER]);
  var rows = readAll_('Audit_Log').filter(function(r) {
    return r.Action === 'BULK_UPLOAD_ADMISSIONS' || r.Action === 'BULK_UPLOAD_STAFF';
  });
  rows.sort(function(a, b) { return new Date(b.Timestamp) - new Date(a.Timestamp); });
  return rows.slice(0, 50).map(function(r) {
    var nv = {};
    try { nv = JSON.parse(r.New_Value || '{}'); } catch(e) {}
    return {
      action:    r.Action,
      user_id:   r.User_ID,
      role:      r.Role,
      total:     nv.total || 0,
      success:   nv.success || 0,
      errors:    nv.errors  || 0,
      timestamp: r.Timestamp,
    };
  });
}

  requireRole_(actor, ADMISSION_CREATE_ROLES);

  var required = ['Full_Name', 'Phone', 'Centre', 'Course', 'Batch', 'Target_Year', 'Segment'];
  required.forEach(function (f) {
    if (!fields[f]) throw new Error('Missing required field: ' + f);
  });

  return withLock_(function () {
    // 1. Record the admission itself.
    var admissionId = nextId_('Admission_Master', 'ADM', 'Admission_ID');
    var admission = Object.assign({}, fields);
    admission.Admission_ID = admissionId;
    admission.Admission_Date = fields.Admission_Date || new Date().toISOString();
    admission.Status = 'Active';
    admission.Created_At = new Date().toISOString();
    admission.Created_By = actor.sub;
    appendRow_('Admission_Master', admission);

    // 2. Auto-create the Student record.
    var studentId = nextId_('Students', 'STU', 'Student_ID');
    var salt = randomSalt_();
    var tempPassword = generateTempPassword_();
    var portalUsername = fields.Phone; // simple, unique, memorable — student can change it later
    var qrIdentity = signJwt_({ sub: studentId, type: 'STUDENT_ID_CARD' }, 10 * 365 * 24 * 3600); // effectively long-lived

    var student = {
      Student_ID: studentId,
      Admission_ID: admissionId,
      Full_Name: fields.Full_Name,
      DOB: fields.DOB || '',
      Gender: fields.Gender || '',
      Phone: fields.Phone,
      Email: fields.Email || '',
      Centre: fields.Centre,
      Course: fields.Course,
      Batch: fields.Batch,
      Target_Year: fields.Target_Year,
      Segment: fields.Segment,
      Parent_ID: '',
      Portal_Username: portalUsername,
      Password_Hash: hashPassword_(tempPassword, salt),
      Salt: salt,
      Must_Reset_Password: true,
      QR_Identity: qrIdentity,
      Photo_URL: '',
      Status: 'Active',
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString()
    };
    appendRow_('Students', student);

    // 3. Auto-create a linked Parent account, if parent details were given.
    var parentId = '';
    if (fields.Parent_Name && fields.Parent_Phone) {
      parentId = nextId_('Parents', 'PAR', 'Parent_ID');
      var pSalt = randomSalt_();
      var pTempPassword = generateTempPassword_();
      appendRow_('Parents', {
        Parent_ID: parentId,
        Full_Name: fields.Parent_Name,
        Phone: fields.Parent_Phone,
        Email: fields.Parent_Email || '',
        Student_IDs: studentId,
        Password_Hash: hashPassword_(pTempPassword, pSalt),
        Salt: pSalt,
        Status: 'Active',
        Created_At: new Date().toISOString()
      });
      var studentRow = findOne_('Students', 'Student_ID', studentId);
      updateRow_('Students', studentRow._row, { Parent_ID: parentId });
      logSystem_('INFO', 'Parent account ' + parentId + ' created, temp password: ' + pTempPassword, 'createAdmission_');
    }

    logAudit_(actor.sub, actor.role, 'CREATE', 'Admission_Master', admissionId, null, admission);
    logAudit_(actor.sub, actor.role, 'AUTO_CREATE', 'Students', studentId, null, { linkedTo: admissionId });
    logSystem_('INFO', 'Student ' + studentId + ' auto-created, temp password: ' + tempPassword, 'createAdmission_');

    return {
      admissionId: admissionId,
      studentId: studentId,
      parentId: parentId,
      portalUsername: portalUsername,
      studentTempPassword: tempPassword
    };
  });
}
