/**
 * Attendance.gs — Milestone 4: Hybrid QR Attendance System
 * -----------------------------------------------------------------------
 * Covers every attendance operation:
 *  Section 1  — Session lifecycle (create, get live, list, close)
 *  Section 2  — QR token generation & refresh
 *  Section 3  — Student scan with 8 server-side validations
 *  Section 4  — Auto-close & auto-absent (called by time trigger)
 *  Section 5  — Manual corrections with full audit trail
 *  Section 6  — Leave requests
 *  Section 7  — Attendance dashboard stats
 *  Section 8  — Attendance calendar
 *  Section 9  — Reports (subject-wise, defaulters, monthly summary)
 *  Section 10 — Student self-service (own profile, percentage, calendar)
 * -----------------------------------------------------------------------
 */

// ── Permission sets ──────────────────────────────────────────────────────────
var ATT_TEACHER_ROLES  = [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER, ROLES.TEACHER];
var ATT_MANAGER_ROLES  = [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER];
var ATT_READ_ROLES     = [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER, ROLES.TEACHER, ROLES.COUNSELLOR];
var ATT_CORRECT_ROLES  = [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER, ROLES.TEACHER];

// ── Helpers ──────────────────────────────────────────────────────────────────
function nowIso_() { return new Date().toISOString(); }
function todayStr_() { return new Date().toISOString().split('T')[0]; }

function getSettingVal_(key, fallback) {
  try {
    var row = findOne_('Settings', 'Setting_Key', key);
    return row ? row.Setting_Value : fallback;
  } catch(e) { return fallback; }
}

// ================================================================
// SECTION 1 — SESSION LIFECYCLE
// ================================================================

/**
 * Teacher creates an attendance session.
 * Returns the session ID, encrypted QR token, and expiry.
 */
function createAttendanceSession_(fields, actor) {
  requireRole_(actor, ATT_TEACHER_ROLES);

  var required = ['Centre', 'Batch', 'Course', 'Subject', 'Duration_Minutes', 'Start_Time', 'Classroom'];
  required.forEach(function(f) {
    if (!fields[f]) throw new Error('Missing required field: ' + f);
  });

  return withLock_(function() {
    var sessionId  = nextId_('Attendance_Sessions', 'SES', 'Session_ID');
    var now        = new Date();
    var startTime  = fields.Start_Time ? new Date(fields.Start_Time) : now;
    var durationMs = Number(fields.Duration_Minutes) * 60000;
    var graceMs    = Number(fields.Grace_Minutes || getSettingVal_('QR_GRACE_MINUTES', 5)) * 60000;
    var expiryTime = new Date(startTime.getTime() + durationMs + graceMs);

    var qrExpirySec = Number(getSettingVal_('QR_EXPIRY_SECONDS', 90));
    var token       = generateQrToken_(sessionId, qrExpirySec);

    var session = {
      Session_ID:       sessionId,
      Centre:           fields.Centre,
      Batch:            fields.Batch,
      Course:           fields.Course,
      Subject:          fields.Subject,
      Teacher_ID:       actor.sub,
      Classroom:        fields.Classroom,
      Start_Time:       startTime.toISOString(),
      Duration_Minutes: fields.Duration_Minutes,
      Grace_Minutes:    fields.Grace_Minutes || 5,
      Expiry_Time:      expiryTime.toISOString(),
      QR_Token:         token.token,
      Status:           'Active',
      Created_At:       now.toISOString(),
    };

    appendRow_('Attendance_Sessions', session);
    logAudit_(actor.sub, actor.role, 'CREATE_SESSION', 'Attendance_Sessions', sessionId, null, session);
    logSystem_('INFO', 'Session ' + sessionId + ' created by ' + actor.sub, 'createAttendanceSession_');

    return {
      session:     session,
      qr_token:    token.token,
      qr_expiry:   token.expiry,
      session_id:  sessionId,
      qr_data:     buildQrData_(sessionId, token.token),
    };
  });
}

/** Fetches a session with live attendance counts. */
function getSession_(sessionId, actor) {
  requireRole_(actor, ATT_READ_ROLES.concat([ROLES.STUDENT]));

  var session = findOne_('Attendance_Sessions', 'Session_ID', sessionId);
  if (!session) throw new Error('Session ' + sessionId + ' not found.');

  var logs = readAll_('Attendance_Log').filter(function(r) {
    return String(r.Session_ID) === String(sessionId);
  });

  // Get total students in batch
  var batchStudents = readAll_('Students').filter(function(r) {
    return r.Batch === session.Batch && r.Status === 'Active';
  });

  var presentCount = logs.filter(function(r) { return r.Status === 'Present'; }).length;
  var now = new Date();
  var isExpired = session.Expiry_Time && new Date(session.Expiry_Time) < now;

  return {
    session:        session,
    present_count:  presentCount,
    total_students: batchStudents.length,
    absent_count:   Math.max(0, batchStudents.length - presentCount),
    attendance_pct: batchStudents.length > 0 ? Math.round(presentCount / batchStudents.length * 100) : 0,
    is_expired:     isExpired,
    logs:           logs,
    students:       batchStudents.map(function(s) {
      var log = logs.find(function(l) { return String(l.Student_ID) === String(s.Student_ID); });
      return {
        student_id:   s.Student_ID,
        name:         s.Full_Name,
        phone:        s.Phone,
        status:       log ? log.Status : 'Absent',
        timestamp:    log ? log.Timestamp : null,
        device:       log ? log.Device : null,
      };
    }),
  };
}

/** Lists sessions — filtered by centre/teacher and date. */
function listSessions_(filters, actor) {
  requireRole_(actor, ATT_READ_ROLES);

  var rows = readAll_('Attendance_Sessions');

  // Teachers see only their own sessions
  if (actor.role === ROLES.TEACHER) {
    rows = rows.filter(function(r) { return String(r.Teacher_ID) === String(actor.sub); });
  }
  // Centre managers see their centre
  if (actor.role === ROLES.CENTRE_MANAGER && actor.centre) {
    rows = rows.filter(function(r) { return r.Centre === actor.centre; });
  }

  if (filters) {
    if (filters.centre)  rows = rows.filter(function(r) { return r.Centre  === filters.centre;  });
    if (filters.batch)   rows = rows.filter(function(r) { return r.Batch   === filters.batch;   });
    if (filters.status)  rows = rows.filter(function(r) { return r.Status  === filters.status;  });
    if (filters.date) {
      rows = rows.filter(function(r) {
        return String(r.Start_Time || r.Created_At).slice(0, 10) === filters.date;
      });
    }
  }

  rows.sort(function(a, b) { return new Date(b.Created_At) - new Date(a.Created_At); });
  return rows.slice(0, 100); // latest 100
}

/** Gets all active sessions right now (used by admin live view). */
function getActiveSessions_(actor) {
  requireRole_(actor, ATT_READ_ROLES);
  var now  = new Date();
  var rows = readAll_('Attendance_Sessions').filter(function(r) {
    return r.Status === 'Active' && new Date(r.Expiry_Time) > now;
  });

  if (actor.role === ROLES.CENTRE_MANAGER && actor.centre) {
    rows = rows.filter(function(r) { return r.Centre === actor.centre; });
  }
  if (actor.role === ROLES.TEACHER) {
    rows = rows.filter(function(r) { return String(r.Teacher_ID) === String(actor.sub); });
  }

  return rows.map(function(s) {
    var logs = readAll_('Attendance_Log').filter(function(l) {
      return String(l.Session_ID) === String(s.Session_ID);
    });
    var total = readAll_('Students').filter(function(st) {
      return st.Batch === s.Batch && st.Status === 'Active';
    }).length;
    return Object.assign({}, s, {
      present_count: logs.filter(function(l) { return l.Status === 'Present'; }).length,
      total_students: total,
    });
  });
}

/** Teacher manually closes a session early. */
function closeSession_(sessionId, actor) {
  requireRole_(actor, ATT_TEACHER_ROLES);
  return withLock_(function() {
    var session = findOne_('Attendance_Sessions', 'Session_ID', sessionId);
    if (!session) throw new Error('Session ' + sessionId + ' not found.');
    if (session.Status === 'Closed') throw new Error('Session already closed.');
    autoMarkAbsent_(sessionId, session);
    updateRow_('Attendance_Sessions', session._row, { Status: 'Closed' });
    logAudit_(actor.sub, actor.role, 'CLOSE_SESSION', 'Attendance_Sessions', sessionId, null, null);
    return generateSessionSummary_(sessionId);
  });
}

// ================================================================
// SECTION 2 — QR TOKEN GENERATION & REFRESH
// ================================================================

function generateQrToken_(sessionId, expirySec) {
  expirySec = expirySec || Number(getSettingVal_('QR_EXPIRY_SECONDS', 90));
  var payload = { sub: sessionId, type: 'ATT_QR', iat: Math.floor(Date.now() / 1000) };
  var token   = signJwt_(payload, expirySec);
  var expiry  = new Date(Date.now() + expirySec * 1000).toISOString();
  return { token: token, expiry: expiry };
}

function buildQrData_(sessionId, token) {
  return JSON.stringify({ session_id: sessionId, token: token, v: 1 });
}

/**
 * Teacher requests a fresh QR token — called every ~80 seconds
 * by the frontend to rotate the QR before it expires.
 */
function refreshQrToken_(sessionId, actor) {
  requireRole_(actor, ATT_TEACHER_ROLES);
  return withLock_(function() {
    var session = findOne_('Attendance_Sessions', 'Session_ID', sessionId);
    if (!session) throw new Error('Session ' + sessionId + ' not found.');
    if (session.Status !== 'Active') throw new Error('Session is not active.');
    if (new Date(session.Expiry_Time) < new Date()) throw new Error('Session has expired.');

    var t = generateQrToken_(sessionId, null);
    updateRow_('Attendance_Sessions', session._row, { QR_Token: t.token });
    return { qr_token: t.token, qr_expiry: t.expiry, qr_data: buildQrData_(sessionId, t.token) };
  });
}

// ================================================================
// SECTION 3 — STUDENT QR SCAN (8-POINT VALIDATION)
// ================================================================

/**
 * Called when a student scans the QR code.
 * All 8 validations happen server-side — the frontend result is never trusted.
 */
function recordAttendance_(scanData, deviceInfo, actor) {
  if (actor.role !== ROLES.STUDENT) throw new Error('Only students can mark their own attendance.');

  var sessionId, qrToken;
  try {
    var parsed = typeof scanData === 'string' ? JSON.parse(scanData) : scanData;
    sessionId  = parsed.session_id;
    qrToken    = parsed.token;
  } catch(e) {
    throw new Error('Invalid QR code. Please scan the code displayed by your teacher.');
  }

  return withLock_(function() {
    // ── Validation 1: Session exists ─────────────────────────────
    var session = findOne_('Attendance_Sessions', 'Session_ID', sessionId);
    if (!session) throw new Error('Invalid QR code — session not found.');

    // ── Validation 2: Session is Active ─────────────────────────
    if (session.Status !== 'Active') throw new Error('This session is no longer active.');

    // ── Validation 3: Session not expired ───────────────────────
    var now = new Date();
    if (session.Expiry_Time && new Date(session.Expiry_Time) < now) {
      throw new Error('Session has expired. Please ask your teacher to start a new session.');
    }

    // ── Validation 4: QR token is valid & not expired ───────────
    try {
      var payload = verifyJwt_(qrToken);
      if (payload.sub !== sessionId || payload.type !== 'ATT_QR') {
        throw new Error('QR token mismatch.');
      }
    } catch(e) {
      throw new Error('QR code has expired. Wait for your teacher to refresh it and scan again.');
    }

    // ── Validation 5: Current QR matches the session's live QR ──
    if (String(session.QR_Token) !== String(qrToken)) {
      throw new Error('QR code is outdated. Please scan the latest QR displayed by your teacher.');
    }

    // ── Validation 6: Student is logged in and account is active ─
    var student = findOne_('Students', 'Student_ID', actor.sub);
    if (!student || student.Status !== 'Active') {
      throw new Error('Your student account is not active. Please contact your centre manager.');
    }

    // ── Validation 7: Student belongs to this batch AND centre ──
    if (String(student.Batch) !== String(session.Batch)) {
      throw new Error('You are not enrolled in the batch for this session.');
    }
    if (String(student.Centre) !== String(session.Centre)) {
      throw new Error('This session is for a different centre.');
    }

    // ── Validation 8: Not already marked ────────────────────────
    var existing = readAll_('Attendance_Log').filter(function(r) {
      return String(r.Session_ID) === String(sessionId) &&
             String(r.Student_ID) === String(actor.sub);
    });
    if (existing.length > 0) {
      throw new Error('You have already marked attendance for this session at ' +
        new Date(existing[0].Timestamp).toLocaleTimeString('en-IN'));
    }

    // ── All validations passed — record attendance ───────────────
    var logId = nextId_('Attendance_Log', 'LOG', 'Log_ID');
    var log = {
      Log_ID:     logId,
      Session_ID: sessionId,
      Student_ID: actor.sub,
      Timestamp:  now.toISOString(),
      IP:         deviceInfo.ip || '',
      GPS_Lat:    deviceInfo.gps_lat || '',
      GPS_Lng:    deviceInfo.gps_lng || '',
      Device:     deviceInfo.device || '',
      Browser:    deviceInfo.browser || '',
      OS:         deviceInfo.os || '',
      Network:    deviceInfo.network || '',
      Classroom:  session.Classroom,
      Status:     'Present',
      Created_At: now.toISOString(),
    };
    appendRow_('Attendance_Log', log);

    // Live count for teacher's screen
    var presentCount = readAll_('Attendance_Log').filter(function(r) {
      return String(r.Session_ID) === String(sessionId) && r.Status === 'Present';
    }).length;

    logSystem_('INFO', 'Attendance marked: ' + actor.sub + ' in session ' + sessionId, 'recordAttendance_');

    return {
      success:       true,
      message:       'Attendance marked successfully! ✓',
      student_name:  student.Full_Name,
      session_id:    sessionId,
      subject:       session.Subject,
      course:        session.Course,
      timestamp:     now.toISOString(),
      present_count: presentCount,
    };
  });
}

// ================================================================
// SECTION 4 — AUTO-CLOSE & AUTO-ABSENT
// ================================================================

/**
 * Called by Apps Script time trigger every minute.
 * Closes expired sessions and marks remaining students absent.
 */
function autoCloseExpiredSessions() {
  var now = new Date();
  var active = readAll_('Attendance_Sessions').filter(function(r) {
    return r.Status === 'Active' && r.Expiry_Time && new Date(r.Expiry_Time) < now;
  });

  active.forEach(function(session) {
    try {
      withLock_(function() {
        autoMarkAbsent_(session.Session_ID, session);
        updateRow_('Attendance_Sessions', session._row, { Status: 'Closed' });
        logSystem_('INFO', 'Auto-closed session ' + session.Session_ID, 'autoCloseExpiredSessions');
      });
    } catch(e) {
      logSystem_('ERROR', 'Auto-close failed for ' + session.Session_ID + ': ' + e.message, 'autoCloseExpiredSessions');
    }
  });

  return { closed: active.length };
}

function autoMarkAbsent_(sessionId, session) {
  var batchStudents = readAll_('Students').filter(function(r) {
    return String(r.Batch) === String(session.Batch) && r.Status === 'Active';
  });
  var presentIds = readAll_('Attendance_Log')
    .filter(function(r) { return String(r.Session_ID) === String(sessionId); })
    .map(function(r) { return String(r.Student_ID); });

  var absentStudents = batchStudents.filter(function(s) {
    return presentIds.indexOf(String(s.Student_ID)) === -1;
  });

  var now = new Date().toISOString();
  absentStudents.forEach(function(s) {
    var logId = nextId_('Attendance_Log', 'LOG', 'Log_ID');
    appendRow_('Attendance_Log', {
      Log_ID: logId, Session_ID: sessionId, Student_ID: s.Student_ID,
      Timestamp: now, IP: '', GPS_Lat: '', GPS_Lng: '', Device: 'auto',
      Browser: '', OS: '', Network: '', Classroom: session.Classroom,
      Status: 'Absent', Created_At: now,
    });
  });
}

function generateSessionSummary_(sessionId) {
  var session = findOne_('Attendance_Sessions', 'Session_ID', sessionId);
  var logs    = readAll_('Attendance_Log').filter(function(r) { return String(r.Session_ID) === String(sessionId); });
  var present = logs.filter(function(r) { return r.Status === 'Present'; });
  var absent  = logs.filter(function(r) { return r.Status === 'Absent'; });
  return {
    session_id:    sessionId,
    centre:        session ? session.Centre : '',
    batch:         session ? session.Batch  : '',
    course:        session ? session.Course : '',
    subject:       session ? session.Subject : '',
    total:         logs.length,
    present:       present.length,
    absent:        absent.length,
    attendance_pct: logs.length > 0 ? Math.round(present.length / logs.length * 100) : 0,
    present_list:  present.map(function(l) { return l.Student_ID; }),
    absent_list:   absent.map(function(l) { return l.Student_ID; }),
  };
}

// ================================================================
// SECTION 5 — MANUAL CORRECTIONS
// ================================================================

function correctAttendance_(sessionId, studentId, newStatus, reason, actor) {
  requireRole_(actor, ATT_CORRECT_ROLES);
  if (!['Present', 'Absent', 'Late', 'Leave'].includes(newStatus)) {
    throw new Error('Invalid status: ' + newStatus);
  }
  return withLock_(function() {
    var logs = readAll_('Attendance_Log').filter(function(r) {
      return String(r.Session_ID) === String(sessionId) && String(r.Student_ID) === String(studentId);
    });
    var oldStatus = logs.length > 0 ? logs[0].Status : 'Absent';

    // Upsert: update existing log or insert new one
    if (logs.length > 0) {
      updateRow_('Attendance_Log', logs[0]._row, { Status: newStatus });
    } else {
      var logId = nextId_('Attendance_Log', 'LOG', 'Log_ID');
      appendRow_('Attendance_Log', {
        Log_ID: logId, Session_ID: sessionId, Student_ID: studentId,
        Timestamp: new Date().toISOString(), IP: '', GPS_Lat: '', GPS_Lng: '',
        Device: 'manual', Browser: '', OS: '', Network: '', Classroom: '',
        Status: newStatus, Created_At: new Date().toISOString(),
      });
    }

    // Write correction record
    var corrId = nextId_('Attendance_Corrections', 'COR', 'Correction_ID');
    appendRow_('Attendance_Corrections', {
      Correction_ID:    corrId,
      Session_ID:       sessionId,
      Student_ID:       studentId,
      Original_Status:  oldStatus,
      Corrected_Status: newStatus,
      Reason:           reason || '',
      Approved_By:      actor.sub,
      Timestamp:        new Date().toISOString(),
    });
    logAudit_(actor.sub, actor.role, 'CORRECT_ATTENDANCE', 'Attendance_Log', studentId, { status: oldStatus }, { status: newStatus, reason: reason });
    return { corrected: true, old_status: oldStatus, new_status: newStatus };
  });
}

function listCorrections_(filters, actor) {
  requireRole_(actor, ATT_CORRECT_ROLES);
  var rows = readAll_('Attendance_Corrections');
  if (filters && filters.session_id) rows = rows.filter(function(r) { return String(r.Session_ID) === String(filters.session_id); });
  if (filters && filters.student_id) rows = rows.filter(function(r) { return String(r.Student_ID) === String(filters.student_id); });
  return rows;
}

// ================================================================
// SECTION 6 — LEAVE REQUESTS
// ================================================================

function submitLeaveRequest_(fields, actor) {
  if (actor.role !== ROLES.STUDENT && actor.role !== ROLES.PARENT) {
    throw new Error('Only students and parents can submit leave requests.');
  }
  var required = ['From_Date', 'To_Date', 'Reason'];
  required.forEach(function(f) { if (!fields[f]) throw new Error('Missing: ' + f); });

  return withLock_(function() {
    var leaveId = nextId_('Leave_Requests', 'LV', 'Leave_ID');
    var studentId = actor.role === ROLES.STUDENT ? actor.sub : fields.student_id;
    var record = {
      Leave_ID:   leaveId,
      Student_ID: studentId,
      From_Date:  fields.From_Date,
      To_Date:    fields.To_Date,
      Reason:     fields.Reason,
      Status:     'Pending',
      Approved_By: '',
      Created_At: new Date().toISOString(),
    };
    appendRow_('Leave_Requests', record);
    logAudit_(actor.sub, actor.role, 'LEAVE_REQUEST', 'Leave_Requests', leaveId, null, record);
    return record;
  });
}

function processLeaveRequest_(leaveId, action, actor) {
  requireRole_(actor, ATT_CORRECT_ROLES);
  if (!['Approved', 'Rejected'].includes(action)) throw new Error('action must be Approved or Rejected');
  return withLock_(function() {
    var row = findOne_('Leave_Requests', 'Leave_ID', leaveId);
    if (!row) throw new Error('Leave request ' + leaveId + ' not found.');
    var updated = updateRow_('Leave_Requests', row._row, { Status: action, Approved_By: actor.sub });
    logAudit_(actor.sub, actor.role, action + '_LEAVE', 'Leave_Requests', leaveId, row, updated);
    return updated;
  });
}

function listLeaveRequests_(filters, actor) {
  requireRole_(actor, ATT_READ_ROLES.concat([ROLES.STUDENT, ROLES.PARENT]));
  var rows = readAll_('Leave_Requests');
  if (actor.role === ROLES.STUDENT)  rows = rows.filter(function(r) { return String(r.Student_ID) === String(actor.sub); });
  if (actor.role === ROLES.TEACHER)  rows = rows.filter(function(r) {
    var s = findOne_('Students', 'Student_ID', r.Student_ID);
    return s && s.Batch === actor.centre;
  });
  if (filters && filters.status)     rows = rows.filter(function(r) { return r.Status === filters.status; });
  if (filters && filters.student_id) rows = rows.filter(function(r) { return String(r.Student_ID) === String(filters.student_id); });
  return rows;
}

// ================================================================
// SECTION 7 — ATTENDANCE DASHBOARD STATS
// ================================================================

function getAttendanceDashboard_(filters, actor) {
  requireRole_(actor, ATT_READ_ROLES);

  var todayStr = todayStr_();
  var sessions = readAll_('Attendance_Sessions');
  var logs     = readAll_('Attendance_Log');
  var students = readAll_('Students').filter(function(r) { return r.Status === 'Active'; });
  var threshold = Number(getSettingVal_('ATTENDANCE_THRESHOLD_PERCENT', 75));

  // Centre filter
  if (actor.role === ROLES.CENTRE_MANAGER && actor.centre) {
    sessions = sessions.filter(function(r) { return r.Centre === actor.centre; });
    students = students.filter(function(r) { return r.Centre === actor.centre; });
  }
  if (filters && filters.centre) {
    sessions = sessions.filter(function(r) { return r.Centre === filters.centre; });
    students = students.filter(function(r) { return r.Centre === filters.centre; });
  }

  var todaySessions = sessions.filter(function(r) {
    return String(r.Start_Time || r.Created_At).slice(0, 10) === todayStr;
  });
  var activeSessions = sessions.filter(function(r) {
    return r.Status === 'Active' && new Date(r.Expiry_Time) > new Date();
  });

  var todaySessionIds = todaySessions.map(function(r) { return r.Session_ID; });
  var todayLogs = logs.filter(function(r) { return todaySessionIds.indexOf(r.Session_ID) !== -1; });
  var todayPresent = todayLogs.filter(function(r) { return r.Status === 'Present'; }).length;
  var todayAbsent  = todayLogs.filter(function(r) { return r.Status === 'Absent'; }).length;

  // Defaulters (below threshold)
  var studentSessionCounts = {};
  var studentPresentCounts = {};
  logs.forEach(function(l) {
    var sid = l.Student_ID;
    studentSessionCounts[sid] = (studentSessionCounts[sid] || 0) + 1;
    if (l.Status === 'Present') studentPresentCounts[sid] = (studentPresentCounts[sid] || 0) + 1;
  });
  var defaulterCount = students.filter(function(s) {
    var total   = studentSessionCounts[s.Student_ID] || 0;
    var present = studentPresentCounts[s.Student_ID] || 0;
    return total > 0 && Math.round(present / total * 100) < threshold;
  }).length;

  return {
    total_students:      students.length,
    active_sessions:     activeSessions.length,
    today_sessions:      todaySessions.length,
    today_present:       todayPresent,
    today_absent:        todayAbsent,
    today_attendance_pct: todaySessions.length > 0 ? Math.round(todayPresent / (todayPresent + todayAbsent || 1) * 100) : 0,
    defaulter_count:     defaulterCount,
    threshold_pct:       threshold,
    total_sessions_all:  sessions.length,
    active_session_list: activeSessions.slice(0, 10),
  };
}

// ================================================================
// SECTION 8 — ATTENDANCE CALENDAR
// ================================================================

function getAttendanceCalendar_(year, month, filters, actor) {
  requireRole_(actor, ATT_READ_ROLES);

  var monthStr = String(year) + '-' + ('0' + month).slice(-2);
  var sessions = readAll_('Attendance_Sessions').filter(function(r) {
    return String(r.Start_Time || r.Created_At).slice(0, 7) === monthStr;
  });

  if (actor.role === ROLES.CENTRE_MANAGER && actor.centre) {
    sessions = sessions.filter(function(r) { return r.Centre === actor.centre; });
  }
  if (filters && filters.centre) sessions = sessions.filter(function(r) { return r.Centre === filters.centre; });
  if (filters && filters.batch)  sessions = sessions.filter(function(r) { return r.Batch  === filters.batch;  });

  var byDate = {};
  sessions.forEach(function(s) {
    var d = String(s.Start_Time || s.Created_At).slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    var logs = readAll_('Attendance_Log').filter(function(l) { return String(l.Session_ID) === String(s.Session_ID); });
    byDate[d].push({
      session_id:    s.Session_ID,
      subject:       s.Subject,
      batch:         s.Batch,
      course:        s.Course,
      centre:        s.Centre,
      classroom:     s.Classroom,
      teacher_id:    s.Teacher_ID,
      start_time:    s.Start_Time,
      status:        s.Status,
      present_count: logs.filter(function(l) { return l.Status === 'Present'; }).length,
      total_count:   logs.length,
    });
  });
  return byDate;
}

// ================================================================
// SECTION 9 — REPORTS
// ================================================================

/** Subject-wise attendance for a student or batch. */
function getSubjectWiseReport_(filters, actor) {
  requireRole_(actor, ATT_READ_ROLES.concat([ROLES.STUDENT]));

  var sessions = readAll_('Attendance_Sessions');
  var logs     = readAll_('Attendance_Log');

  if (actor.role === ROLES.STUDENT) filters = Object.assign({}, filters, { student_id: actor.sub });

  if (filters && filters.batch)   sessions = sessions.filter(function(r) { return r.Batch   === filters.batch;   });
  if (filters && filters.centre)  sessions = sessions.filter(function(r) { return r.Centre  === filters.centre;  });
  if (filters && filters.subject) sessions = sessions.filter(function(r) { return r.Subject === filters.subject; });
  if (filters && filters.from_date) sessions = sessions.filter(function(r) { return String(r.Start_Time).slice(0,10) >= filters.from_date; });
  if (filters && filters.to_date)   sessions = sessions.filter(function(r) { return String(r.Start_Time).slice(0,10) <= filters.to_date;   });

  var subjects = {};
  sessions.forEach(function(s) {
    if (!subjects[s.Subject]) subjects[s.Subject] = { total: 0, present: 0, absent: 0, sessions: [] };
    var sub = subjects[s.Subject];
    sub.total++;

    if (filters && filters.student_id) {
      var log = logs.find(function(l) {
        return String(l.Session_ID) === String(s.Session_ID) && String(l.Student_ID) === String(filters.student_id);
      });
      if (log && log.Status === 'Present') sub.present++;
      else sub.absent++;
    } else {
      var sessionLogs = logs.filter(function(l) { return String(l.Session_ID) === String(s.Session_ID); });
      sub.present += sessionLogs.filter(function(l) { return l.Status === 'Present'; }).length;
      sub.absent  += sessionLogs.filter(function(l) { return l.Status === 'Absent';  }).length;
    }
    sub.sessions.push({ session_id: s.Session_ID, date: String(s.Start_Time).slice(0,10) });
  });

  return Object.keys(subjects).map(function(subj) {
    var d = subjects[subj];
    return {
      subject:    subj,
      total:      d.total,
      present:    d.present,
      absent:     d.absent,
      percentage: d.total > 0 ? Math.round(d.present / d.total * 100) : 0,
    };
  });
}

/** Defaulter list — students below threshold. */
function getDefaulters_(filters, actor) {
  requireRole_(actor, ATT_READ_ROLES);
  var threshold = filters && filters.threshold ? Number(filters.threshold)
    : Number(getSettingVal_('ATTENDANCE_THRESHOLD_PERCENT', 75));

  var students = readAll_('Students').filter(function(r) { return r.Status === 'Active'; });
  if (actor.role === ROLES.CENTRE_MANAGER && actor.centre) {
    students = students.filter(function(r) { return r.Centre === actor.centre; });
  }
  if (filters && filters.centre) students = students.filter(function(r) { return r.Centre === filters.centre; });
  if (filters && filters.batch)  students = students.filter(function(r) { return r.Batch  === filters.batch;  });

  var logs = readAll_('Attendance_Log');
  var result = [];
  students.forEach(function(s) {
    var stuLogs = logs.filter(function(l) { return String(l.Student_ID) === String(s.Student_ID); });
    var total   = stuLogs.length;
    var present = stuLogs.filter(function(l) { return l.Status === 'Present'; }).length;
    var pct     = total > 0 ? Math.round(present / total * 100) : 0;
    if (pct < threshold) {
      result.push({
        student_id:  s.Student_ID,
        name:        s.Full_Name,
        phone:       s.Phone,
        centre:      s.Centre,
        batch:       s.Batch,
        course:      s.Course,
        present:     present,
        total:       total,
        percentage:  pct,
        short_by:    threshold - pct,
      });
    }
  });
  result.sort(function(a, b) { return a.percentage - b.percentage; });
  return result;
}

/** Monthly attendance summary for a batch or centre. */
function getMonthlyAttendanceSummary_(year, month, filters, actor) {
  requireRole_(actor, ATT_READ_ROLES);
  var prefix = String(year) + '-' + ('0' + month).slice(-2);
  var sessions = readAll_('Attendance_Sessions').filter(function(r) {
    return String(r.Start_Time || r.Created_At).slice(0, 7) === prefix;
  });
  if (filters && filters.centre) sessions = sessions.filter(function(r) { return r.Centre === filters.centre; });
  if (filters && filters.batch)  sessions = sessions.filter(function(r) { return r.Batch  === filters.batch;  });

  var logs = readAll_('Attendance_Log');
  var byBatch = {};
  sessions.forEach(function(s) {
    var key = s.Batch + '::' + s.Centre;
    if (!byBatch[key]) byBatch[key] = { batch: s.Batch, centre: s.Centre, sessions: 0, present: 0, absent: 0 };
    var b = byBatch[key];
    b.sessions++;
    var sl = logs.filter(function(l) { return String(l.Session_ID) === String(s.Session_ID); });
    b.present += sl.filter(function(l) { return l.Status === 'Present'; }).length;
    b.absent  += sl.filter(function(l) { return l.Status === 'Absent';  }).length;
  });

  return Object.values(byBatch).map(function(b) {
    var total = b.present + b.absent;
    return Object.assign({}, b, { total: total, percentage: total > 0 ? Math.round(b.present / total * 100) : 0 });
  });
}

// ================================================================
// SECTION 10 — STUDENT SELF-SERVICE
// ================================================================

function getMyAttendance_(actor) {
  if (actor.role !== ROLES.STUDENT && actor.role !== ROLES.PARENT) {
    throw new Error('This endpoint is for students and parents only.');
  }

  var studentId = actor.role === ROLES.STUDENT ? actor.sub : null;
  if (actor.role === ROLES.PARENT) {
    var parent = findOne_('Parents', 'Parent_ID', actor.sub);
    if (!parent) throw new Error('Parent not found.');
    studentId = String(parent.Student_IDs).split(',')[0].trim();
  }

  var student = findOne_('Students', 'Student_ID', studentId);
  if (!student) throw new Error('Student not found.');

  var logs     = readAll_('Attendance_Log').filter(function(r) { return String(r.Student_ID) === String(studentId); });
  var sessions = readAll_('Attendance_Sessions');
  var sessionMap = {};
  sessions.forEach(function(s) { sessionMap[s.Session_ID] = s; });

  var total   = logs.length;
  var present = logs.filter(function(l) { return l.Status === 'Present'; }).length;
  var absent  = logs.filter(function(l) { return l.Status === 'Absent';  }).length;
  var late    = logs.filter(function(l) { return l.Status === 'Late';    }).length;
  var pct     = total > 0 ? Math.round(present / total * 100) : 0;
  var threshold = Number(getSettingVal_('ATTENDANCE_THRESHOLD_PERCENT', 75));

  // Subject-wise
  var subjects = {};
  logs.forEach(function(l) {
    var s = sessionMap[l.Session_ID];
    if (!s) return;
    if (!subjects[s.Subject]) subjects[s.Subject] = { total: 0, present: 0 };
    subjects[s.Subject].total++;
    if (l.Status === 'Present') subjects[s.Subject].present++;
  });
  var subjectWise = Object.keys(subjects).map(function(subj) {
    var d = subjects[subj];
    return { subject: subj, total: d.total, present: d.present, percentage: d.total > 0 ? Math.round(d.present / d.total * 100) : 0 };
  });

  // Calendar entries (by date)
  var byDate = {};
  logs.forEach(function(l) {
    var s = sessionMap[l.Session_ID];
    var d = String(l.Timestamp).slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push({ subject: s ? s.Subject : '', status: l.Status, time: l.Timestamp });
  });

  // Needed classes to reach threshold
  var neededForThreshold = 0;
  if (pct < threshold) {
    var x = total;
    while (Math.round(present / x * 100) < threshold) x++;
    neededForThreshold = x - total;
  }

  return {
    student:          { id: student.Student_ID, name: student.Full_Name, batch: student.Batch, course: student.Course, centre: student.Centre },
    overall:          { total, present, absent, late, percentage: pct, threshold, is_defaulter: pct < threshold, needed_for_threshold: neededForThreshold },
    subject_wise:     subjectWise,
    by_date:          byDate,
    recent_logs:      logs.slice(-30).reverse(),
    leave_requests:   readAll_('Leave_Requests').filter(function(r) { return String(r.Student_ID) === String(studentId); }),
  };
}

// ================================================================
// TRIGGER SETUP — run once from Apps Script editor
// ================================================================

/**
 * Run this once from the Apps Script editor to set up the
 * auto-close trigger. After running, sessions will automatically
 * close and mark absent students every minute.
 */
function setupAttendanceTrigger() {
  // Remove any existing trigger first
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'autoCloseExpiredSessions') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // Run every minute
  ScriptApp.newTrigger('autoCloseExpiredSessions')
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log('Attendance auto-close trigger set up — runs every 1 minute.');
}

// ================================================================
// SECTION 11 — ATTENDANCE CERTIFICATE
// ================================================================

/**
 * Generates a professional attendance certificate PDF via DriveApp.
 * Stores in Drive, returns public download URL.
 * Can be called on-demand by student or admin.
 */
function generateAttendanceCertificate_(studentId, filters, actor) {
  var student = findOne_('Students', 'Student_ID', studentId);
  if (!student) throw new Error('Student not found: ' + studentId);

  var logs    = readAll_('Attendance_Log').filter(function (l) { return l.Student_ID === studentId; });

  // Apply date filters if provided
  if (filters && filters.from_date) {
    var from = new Date(filters.from_date);
    logs = logs.filter(function (l) { return new Date(l.Timestamp) >= from; });
  }
  if (filters && filters.to_date) {
    var to = new Date(filters.to_date); to.setHours(23, 59, 59, 999);
    logs = logs.filter(function (l) { return new Date(l.Timestamp) <= to; });
  }

  var total   = logs.length;
  var present = logs.filter(function (l) { return l.Status === 'Present' || l.Status === 'Late'; }).length;
  var pct     = total > 0 ? Math.round(present / total * 100) : 0;
  var institute = getSettingVal_('INSTITUTE_NAME', 'Institute Management Platform');
  var certNo  = 'CERT-' + studentId + '-' + Date.now().toString().slice(-6);
  var fromStr = filters && filters.from_date ? filters.from_date : (logs.length ? logs[0].Timestamp.split('T')[0] : 'N/A');
  var toStr   = filters && filters.to_date   ? filters.to_date   : new Date().toISOString().split('T')[0];

  var colour  = pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
    + 'body{font-family:Georgia,serif;margin:0;padding:0;background:#fff}'
    + '.page{width:794px;min-height:1123px;margin:auto;padding:60px;box-sizing:border-box;border:12px solid #1e40af;position:relative}'
    + '.inner{border:2px solid #93c5fd;padding:40px;min-height:900px}'
    + 'h1{color:#1e40af;font-size:32px;text-align:center;margin-bottom:4px}'
    + '.subtitle{text-align:center;color:#64748b;font-size:13px;margin-bottom:40px;letter-spacing:2px;text-transform:uppercase}'
    + '.seal{text-align:center;font-size:80px;margin:20px 0}'
    + '.body{font-size:15px;line-height:1.9;color:#374151;text-align:center;margin:30px 0}'
    + '.pct{font-size:56px;font-weight:900;color:' + colour + ';text-align:center;margin:20px 0}'
    + '.details{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:30px 0;font-size:13px}'
    + '.detail-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px}'
    + '.detail-label{color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:1px}'
    + '.detail-value{color:#1e293b;font-weight:bold;margin-top:4px;font-size:14px}'
    + '.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px}'
    + '.sig-line{display:inline-block;width:200px;border-bottom:1px solid #374151;margin-top:40px}'
    + '</style></head><body><div class="page"><div class="inner">'
    + '<h1>' + institute + '</h1>'
    + '<div class="subtitle">Certificate of Attendance</div>'
    + '<div class="seal">🎓</div>'
    + '<div class="body">This is to certify that</div>'
    + '<div style="font-size:26px;font-weight:900;color:#1e293b;text-align:center;margin:8px 0">' + student.Full_Name + '</div>'
    + '<div style="text-align:center;color:#64748b;margin-bottom:20px">' + student.Student_ID + ' | ' + student.Course + ' | ' + student.Batch + '</div>'
    + '<div class="body">has maintained an overall attendance of</div>'
    + '<div class="pct">' + pct + '%</div>'
    + '<div class="body">(' + present + ' out of ' + total + ' classes attended)<br>from <strong>' + fromStr + '</strong> to <strong>' + toStr + '</strong></div>'
    + '<div class="details">'
    + '<div class="detail-item"><div class="detail-label">Centre</div><div class="detail-value">' + student.Centre + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">Course</div><div class="detail-value">' + student.Course + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">Certificate No.</div><div class="detail-value">' + certNo + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">Issue Date</div><div class="detail-value">' + new Date().toLocaleDateString('en-IN') + '</div></div>'
    + '</div>'
    + '<div style="text-align:center;margin-top:40px">'
    + '<div class="sig-line"></div><br>'
    + '<div style="font-size:12px;color:#374151;margin-top:8px">Authorized Signatory</div>'
    + '<div style="font-size:11px;color:#94a3b8">' + institute + '</div>'
    + '</div>'
    + '<div class="footer">This certificate was digitally generated by ' + institute + ' on ' + new Date().toLocaleString('en-IN')
    + ' and can be verified at the institute. Certificate No: ' + certNo + '</div>'
    + '</div></div></body></html>';

  var folder = getOrCreateCertFolder_(studentId);
  var blob   = Utilities.newBlob(html, 'text/html').getAs('application/pdf');
  blob.setName('AttendanceCertificate_' + studentId + '_' + Date.now() + '.pdf');
  var file   = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  logAudit_(actor ? actor.sub : studentId, actor ? actor.role : 'STUDENT', 'GENERATE_CERTIFICATE', 'Attendance_Log', studentId, null, { cert_no: certNo, pct: pct });
  return { url: file.getDownloadUrl(), cert_no: certNo, pct: pct, present: present, total: total };
}

function getOrCreateCertFolder_(studentId) {
  var root = DriveApp.getRootFolder();
  var imp  = root.getFoldersByName('IMP_Certificates');
  var base = imp.hasNext() ? imp.next() : root.createFolder('IMP_Certificates');
  var sf   = base.getFoldersByName(studentId);
  return sf.hasNext() ? sf.next() : base.createFolder(studentId);
}

// ================================================================
// SECTION 12 — DUPLICATE DETECTION
// ================================================================

function checkDuplicateAdmission_(phone, email) {
  var students = readAll_('Students');
  var byPhone  = students.filter(function (s) { return s.Phone === phone && s.Status !== 'Deleted'; });
  var byEmail  = email ? students.filter(function (s) { return s.Email && s.Email.toLowerCase() === email.toLowerCase() && s.Status !== 'Deleted'; }) : [];
  return {
    phone_duplicate: byPhone.length > 0 ? byPhone[0] : null,
    email_duplicate: byEmail.length > 0 ? byEmail[0] : null,
    has_duplicate:   byPhone.length > 0 || byEmail.length > 0,
  };
}

// ================================================================
// SECTION 13 — GLOBAL ADMIN FILTERS (attendance stats with filters)
// ================================================================

function getFilteredAttendanceStats_(filters, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER]);
  var sessions = readAll_('Attendance_Sessions');
  var logs     = readAll_('Attendance_Log');

  if (filters.centre)      sessions = sessions.filter(function (s) { return s.Centre === filters.centre; });
  if (filters.batch)       sessions = sessions.filter(function (s) { return s.Batch  === filters.batch;  });
  if (filters.course)      sessions = sessions.filter(function (s) { return s.Course === filters.course; });
  if (filters.subject)     sessions = sessions.filter(function (s) { return s.Subject=== filters.subject;});
  if (filters.teacher_id)  sessions = sessions.filter(function (s) { return s.Teacher_ID === filters.teacher_id; });
  if (filters.from_date) {
    var from = new Date(filters.from_date);
    sessions = sessions.filter(function (s) { return new Date(s.Start_Time) >= from; });
  }
  if (filters.to_date) {
    var to = new Date(filters.to_date); to.setHours(23, 59, 59, 999);
    sessions = sessions.filter(function (s) { return new Date(s.Start_Time) <= to; });
  }

  var sessionIds = new Set(sessions.map(function (s) { return s.Session_ID; }));
  var filteredLogs = logs.filter(function (l) { return sessionIds.has(l.Session_ID); });

  if (filters.student_id)  filteredLogs = filteredLogs.filter(function (l) { return l.Student_ID === filters.student_id; });

  var total   = filteredLogs.length;
  var present = filteredLogs.filter(function (l) { return l.Status === 'Present' || l.Status === 'Late'; }).length;
  var absent  = filteredLogs.filter(function (l) { return l.Status === 'Absent'; }).length;
  var late    = filteredLogs.filter(function (l) { return l.Status === 'Late'; }).length;

  // Daily trend for charting
  var byDay = {};
  filteredLogs.forEach(function (l) {
    var d = String(l.Timestamp || l.Created_At || '').slice(0, 10);
    if (!d) return;
    if (!byDay[d]) byDay[d] = { date: d, present: 0, absent: 0, late: 0, total: 0 };
    byDay[d][l.Status.toLowerCase()] = (byDay[d][l.Status.toLowerCase()] || 0) + 1;
    byDay[d].total += 1;
  });
  var trend = Object.values(byDay).sort(function (a, b) { return a.date.localeCompare(b.date); }).map(function (d) {
    return Object.assign(d, { pct: d.total > 0 ? Math.round(d.present / d.total * 100) : 0 });
  });

  return {
    total_sessions:  sessions.length,
    total_logs:      total,
    present:         present,
    absent:          absent,
    late:            late,
    overall_pct:     total > 0 ? Math.round(present / total * 100) : 0,
    trend:           trend,
    filters_applied: filters,
  };
}
