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
function createAdmission_(fields, actor) {
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
