/**
 * Notifications.gs — Milestone 7: Notification Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Section 1 — Core dispatch (email via GmailApp, WhatsApp/SMS stubs)
 * Section 2 — Attendance alerts (below threshold, continuous absentee)
 * Section 3 — Fee reminders (upcoming due, overdue, payment confirmation)
 * Section 4 — Admission welcome email
 * Section 5 — General announcements
 * Section 6 — Notification log (stored in Notifications table)
 * Section 7 — Scheduled batch triggers
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Permission ────────────────────────────────────────────────────────────────
var NOTIF_ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER, ROLES.REGIONAL_MANAGER];

// ── Setting helpers ────────────────────────────────────────────────────────────
function getSetting_(key, fallback) {
  try {
    var row = findOne_('Settings', 'Setting_Key', key);
    return row ? row.Setting_Value : fallback;
  } catch(e) { return fallback; }
}

function isFeatureEnabled_(flag) {
  try {
    var row = findOne_('Feature_Flags', 'Flag_Key', flag);
    return row && (row.Enabled === 'TRUE' || row.Enabled === true);
  } catch(e) { return false; }
}

// ================================================================
// SECTION 1 — CORE DISPATCH
// ================================================================

/**
 * Send an email via GmailApp (runs under the script owner's Google account).
 * Falls back to logging if email fails — never crashes the caller.
 */
function sendEmail_(to, subject, htmlBody, replyTo) {
  if (!isFeatureEnabled_('NOTIFICATIONS_EMAIL')) {
    logSystem_('INFO', 'Email skipped (feature disabled): ' + subject, 'sendEmail_');
    return false;
  }
  try {
    GmailApp.sendEmail(to, subject, '', {
      htmlBody: htmlBody,
      replyTo: replyTo || getSetting_('INSTITUTE_EMAIL', Session.getActiveUser().getEmail()),
      name: getSetting_('INSTITUTE_NAME', 'Institute Management Platform'),
    });
    logNotification_('EMAIL', to, subject, 'Sent');
    return true;
  } catch(e) {
    logSystem_('ERROR', 'Email failed to ' + to + ': ' + e.message, 'sendEmail_');
    logNotification_('EMAIL', to, subject, 'Failed');
    return false;
  }
}

/** WhatsApp stub — logs the message for future integration via Twilio / WATI / AiSensy */
function sendWhatsApp_(phone, message, templateId) {
  if (!isFeatureEnabled_('NOTIFICATIONS_WHATSAPP')) return false;
  logSystem_('INFO', 'WhatsApp (stub) → ' + phone + ': ' + message.slice(0, 60), 'sendWhatsApp_');
  logNotification_('WHATSAPP', phone, message.slice(0, 100), 'Queued');
  // TODO: replace with real API call, e.g.:
  // UrlFetchApp.fetch('https://api.whatsapp-provider.com/send', { method:'POST', payload: {...} })
  return true;
}

/** SMS stub — for future Twilio / MSG91 / Fast2SMS integration */
function sendSms_(phone, message) {
  if (!isFeatureEnabled_('NOTIFICATIONS_SMS')) return false;
  logSystem_('INFO', 'SMS (stub) → ' + phone + ': ' + message.slice(0, 60), 'sendSms_');
  logNotification_('SMS', phone, message.slice(0, 100), 'Queued');
  return true;
}

function logNotification_(type, recipient, title, status) {
  try {
    appendRow_('Notifications', {
      Notification_ID: Utilities.getUuid(),
      Type:            type,
      Recipient_Role:  '',
      Recipient_ID:    recipient,
      Title:           title,
      Message:         '',
      Channel:         type,
      Status:          status,
      Created_At:      new Date().toISOString(),
      Sent_At:         status === 'Sent' ? new Date().toISOString() : '',
    });
  } catch(e) { /* notification log must never crash the caller */ }
}

// ── Email templates ────────────────────────────────────────────────────────────
function emailWrapper_(content) {
  var institute = getSetting_('INSTITUTE_NAME', 'Institute Management Platform');
  var colour    = getSetting_('BRAND_COLOUR', '#2563eb');
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">'
    + '<div style="background:' + colour + ';border-radius:12px 12px 0 0;padding:24px;text-align:center">'
    + '<h2 style="color:#fff;margin:0;font-size:20px">' + institute + '</h2></div>'
    + '<div style="background:#fff;border-radius:0 0 12px 12px;padding:28px">'
    + content
    + '</div>'
    + '<p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">This is an automated notification from ' + institute + '</p></div>';
}

// ================================================================
// SECTION 2 — ATTENDANCE ALERTS
// ================================================================

/**
 * Called by the daily trigger. Checks every active student's attendance
 * percentage and sends alerts when below the configured threshold.
 */
function runAttendanceAlerts() {
  var threshold = Number(getSetting_('ATTENDANCE_THRESHOLD_PERCENT', 75));
  var students  = readAll_('Students').filter(function(s){ return s.Status === 'Active'; });
  var alertCount = 0;

  students.forEach(function(student) {
    try {
      var logs = readAll_('Attendance_Log').filter(function(l){ return l.Student_ID === student.Student_ID; });
      if (logs.length === 0) return;

      var present = logs.filter(function(l){ return l.Status === 'Present' || l.Status === 'Late'; }).length;
      var pct     = Math.round(present / logs.length * 100);

      if (pct < threshold) {
        sendAttendanceBelowThresholdAlert_(student, pct, threshold, logs.length, present);
        alertCount++;
      }

      // Continuous absentee: absent for last 5 sessions
      var recent = logs.slice(-5);
      if (recent.length === 5 && recent.every(function(l){ return l.Status === 'Absent'; })) {
        sendContinuousAbsenteeAlert_(student, 5);
        alertCount++;
      }
    } catch(e) {
      logSystem_('ERROR', 'Attendance alert failed for ' + student.Student_ID + ': ' + e.message, 'runAttendanceAlerts');
    }
  });

  logSystem_('INFO', 'Attendance alerts sent: ' + alertCount, 'runAttendanceAlerts');
  return { alerts_sent: alertCount };
}

function sendAttendanceBelowThresholdAlert_(student, pct, threshold, total, present) {
  var subject = '⚠️ Attendance Alert: ' + student.Full_Name;
  var html = emailWrapper_(
    '<h3 style="color:#dc2626">Attendance Below Threshold</h3>'
    + '<p>Dear Student,</p>'
    + '<p>Your current attendance is <strong style="color:#dc2626">' + pct + '%</strong>, which is below the required <strong>' + threshold + '%</strong>.</p>'
    + '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
    + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Classes Attended</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>' + present + ' / ' + total + '</strong></td></tr>'
    + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Current %</td><td style="padding:8px;border:1px solid #e5e7eb"><strong style="color:#dc2626">' + pct + '%</strong></td></tr>'
    + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Required %</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>' + threshold + '%</strong></td></tr>'
    + '</table>'
    + '<p>Please improve your attendance to avoid academic penalties. Contact your centre manager if you need assistance.</p>'
  );

  if (student.Email) sendEmail_(student.Email, subject, html);
  if (student.Phone) sendWhatsApp_(student.Phone, '⚠️ Attendance Alert: Your attendance is ' + pct + '%. Required: ' + threshold + '%. Please attend classes regularly. — ' + getSetting_('INSTITUTE_NAME','IMP'));

  // Also notify parent
  if (student.Parent_ID) {
    var parent = findOne_('Parents', 'Parent_ID', student.Parent_ID);
    if (parent && parent.Email) {
      var parentHtml = emailWrapper_('<h3 style="color:#dc2626">Your Child\'s Attendance Alert</h3><p>Dear Parent,<br>This is to inform you that <strong>' + student.Full_Name + '\'s</strong> attendance has dropped to <strong style="color:#dc2626">' + pct + '%</strong> (required: ' + threshold + '%+). Please ensure regular attendance.</p>');
      sendEmail_(parent.Email, '⚠️ Attendance Alert for ' + student.Full_Name, parentHtml);
    }
    if (parent && parent.Phone) {
      sendWhatsApp_(parent.Phone, '⚠️ Parent Alert: ' + student.Full_Name + '\'s attendance is ' + pct + '%. Required: ' + threshold + '%. Please ensure regular attendance.');
    }
  }
}

function sendContinuousAbsenteeAlert_(student, days) {
  var subject = '🔴 Continuous Absence: ' + student.Full_Name;
  var html = emailWrapper_(
    '<h3 style="color:#dc2626">Continuous Absence Detected</h3>'
    + '<p><strong>' + student.Full_Name + '</strong> has been absent for the last <strong>' + days + ' consecutive sessions</strong>.</p>'
    + '<p>Please reach out to the student or their family immediately.</p>'
  );
  // Notify centre manager
  var managers = readAll_('Managers').filter(function(m){ return m.Centre === student.Centre && m.Status === 'Active'; });
  managers.forEach(function(m){ if (m.Email) sendEmail_(m.Email, subject, html); });
}

// ================================================================
// SECTION 3 — FEE REMINDERS
// ================================================================

/**
 * Called by daily trigger. Sends reminders for upcoming and overdue installments.
 */
function runFeeReminders() {
  var graceDays    = Number(getSetting_('LATE_FEE_GRACE_DAYS', 3));
  var reminderDays = Number(getSetting_('DUE_REMINDER_DAYS_BEFORE', 3));
  var today        = new Date(); today.setHours(0,0,0,0);
  var sent         = 0;

  var insts = readAll_('Fee_Installments').filter(function(r){ return r.Status !== 'Paid' && r.Status !== 'Deleted'; });
  var feeMap = {};
  readAll_('Student_Fees').forEach(function(r){ feeMap[r.Student_ID] = r; });
  var stuMap = {};
  readAll_('Students').forEach(function(r){ stuMap[r.Student_ID] = r; });

  insts.forEach(function(inst) {
    try {
      var due  = new Date(inst.Due_Date); due.setHours(0,0,0,0);
      var diff = Math.round((due - today) / 86400000);
      var stu  = stuMap[inst.Student_ID];
      var fee  = feeMap[inst.Student_ID];
      if (!stu || !fee) return;

      var amount = '₹' + Number(inst.Pending_Amount).toLocaleString('en-IN');

      if (diff === reminderDays) {
        // Upcoming reminder
        sendFeeReminderEmail_(stu, fee, inst, 'upcoming', diff, amount);
        sent++;
      } else if (diff === 0) {
        // Due today
        sendFeeReminderEmail_(stu, fee, inst, 'due_today', 0, amount);
        sent++;
      } else if (diff < 0 && Math.abs(diff) <= 30) {
        // Overdue (remind every 7 days after due date)
        if (Math.abs(diff) % 7 === 0) {
          sendFeeReminderEmail_(stu, fee, inst, 'overdue', Math.abs(diff), amount);
          sent++;
        }
      }
    } catch(e) {
      logSystem_('ERROR', 'Fee reminder failed for ' + inst.Student_ID + ': ' + e.message, 'runFeeReminders');
    }
  });

  logSystem_('INFO', 'Fee reminders sent: ' + sent, 'runFeeReminders');
  return { reminders_sent: sent };
}

function sendFeeReminderEmail_(student, fee, installment, type, days, amount) {
  var templates = {
    upcoming: { emoji:'📅', title:'Fee Due in ' + days + ' Days', urgency:'blue', msg:'Your installment of <strong>' + amount + '</strong> is due in <strong>' + days + ' days</strong> (on ' + installment.Due_Date + '). Please arrange payment to avoid late fees.' },
    due_today:{ emoji:'🔔', title:'Fee Due Today', urgency:'#f59e0b', msg:'Your installment of <strong>' + amount + '</strong> is due <strong>today</strong>. Please pay immediately to avoid overdue charges.' },
    overdue:  { emoji:'🔴', title:'Fee Overdue — ' + days + ' Days', urgency:'#dc2626', msg:'Your installment of <strong>' + amount + '</strong> is <strong>' + days + ' days overdue</strong>. Please pay immediately to avoid further penalties.' },
  };
  var t = templates[type] || templates.upcoming;
  var subject = t.emoji + ' Fee Reminder: ' + student.Full_Name;
  var html = emailWrapper_(
    '<h3 style="color:' + t.urgency + '">' + t.title + '</h3>'
    + '<p>Dear ' + student.Full_Name + ',</p>'
    + '<p>' + t.msg + '</p>'
    + '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
    + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Installment</td><td style="padding:8px;border:1px solid #e5e7eb">#' + installment.Installment_Number + '</td></tr>'
    + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Amount Due</td><td style="padding:8px;border:1px solid #e5e7eb"><strong style="color:' + t.urgency + '">' + amount + '</strong></td></tr>'
    + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Due Date</td><td style="padding:8px;border:1px solid #e5e7eb">' + installment.Due_Date + '</td></tr>'
    + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Course</td><td style="padding:8px;border:1px solid #e5e7eb">' + fee.Course + '</td></tr>'
    + '</table>'
    + '<p>Contact your centre for payment modes and assistance.</p>'
  );

  if (student.Email) sendEmail_(student.Email, subject, html);
  if (student.Phone) sendWhatsApp_(student.Phone, t.emoji + ' Fee Reminder: ' + amount + ' due on ' + installment.Due_Date + '. ' + t.title);

  // Parent notification
  if (student.Parent_ID) {
    var parent = findOne_('Parents', 'Parent_ID', student.Parent_ID);
    if (parent && parent.Phone) {
      sendWhatsApp_(parent.Phone, t.emoji + ' Fee alert for ' + student.Full_Name + ': ' + amount + ' due on ' + installment.Due_Date + '.');
    }
  }
}

/** Sends payment confirmation email after a payment is recorded */
function sendPaymentConfirmation_(studentId, paymentId, amount, receiptNo, actor) {
  try {
    var student = findOne_('Students', 'Student_ID', studentId);
    if (!student || !student.Email) return;
    var subject = '✅ Payment Confirmed — Receipt ' + receiptNo;
    var html = emailWrapper_(
      '<h3 style="color:#10b981">Payment Received Successfully</h3>'
      + '<p>Dear ' + student.Full_Name + ',</p>'
      + '<p>Your payment has been recorded. Thank you!</p>'
      + '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Receipt No.</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>' + receiptNo + '</strong></td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Amount Paid</td><td style="padding:8px;border:1px solid #e5e7eb"><strong style="color:#10b981">₹' + Number(amount).toLocaleString('en-IN') + '</strong></td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Date</td><td style="padding:8px;border:1px solid #e5e7eb">' + new Date().toLocaleDateString('en-IN') + '</td></tr>'
      + '</table>'
      + '<p>You can download your receipt from the student portal anytime.</p>'
    );
    sendEmail_(student.Email, subject, html);
  } catch(e) {
    logSystem_('ERROR', 'Payment confirmation failed: ' + e.message, 'sendPaymentConfirmation_');
  }
}

// ================================================================
// SECTION 4 — ADMISSION WELCOME
// ================================================================

function sendAdmissionWelcome_(studentId, tempPassword) {
  try {
    var student = findOne_('Students', 'Student_ID', studentId);
    if (!student) return;
    var institute = getSetting_('INSTITUTE_NAME', 'Institute Management Platform');
    var subject   = '🎓 Welcome to ' + institute + ' — Your Account is Ready';
    var html = emailWrapper_(
      '<h3 style="color:#2563eb">Welcome, ' + student.Full_Name + '!</h3>'
      + '<p>Your account has been successfully created.</p>'
      + '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Student ID</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>' + student.Student_ID + '</strong></td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Login ID</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>' + student.Portal_Username + '</strong></td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Temp Password</td><td style="padding:8px;border:1px solid #e5e7eb"><strong>' + tempPassword + '</strong></td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Course</td><td style="padding:8px;border:1px solid #e5e7eb">' + student.Course + '</td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">Centre</td><td style="padding:8px;border:1px solid #e5e7eb">' + student.Centre + '</td></tr>'
      + '</table>'
      + '<p style="color:#dc2626;font-weight:bold">Please change your password after first login.</p>'
    );
    if (student.Email) sendEmail_(student.Email, subject, html);
    if (student.Phone) sendWhatsApp_(student.Phone, '🎓 Welcome to ' + institute + '! Your Student ID: ' + student.Student_ID + ' | Login: ' + student.Portal_Username + ' | Temp Password: ' + tempPassword + ' | Please change password after login.');
  } catch(e) {
    logSystem_('ERROR', 'Welcome email failed for ' + studentId + ': ' + e.message, 'sendAdmissionWelcome_');
  }
}

// ================================================================
// SECTION 5 — GENERAL ANNOUNCEMENTS
// ================================================================

function sendAnnouncement_(fields, actor) {
  requireRole_(actor, NOTIF_ADMIN_ROLES);
  var required = ['Title','Message','Target_Role'];
  required.forEach(function(f){ if (!fields[f]) throw new Error('Missing: ' + f); });

  var recipients = [];
  var tables = {
    STUDENT: 'Students', TEACHER: 'Teachers', PARENT: 'Parents',
    CENTRE_MANAGER: 'Managers', ALL: null
  };

  if (fields.Target_Role === 'ALL') {
    ['Students','Teachers','Parents','Managers'].forEach(function(t){
      readAll_(t).filter(function(r){ return r.Status === 'Active' && r.Email; }).forEach(function(r){ recipients.push(r.Email); });
    });
  } else {
    var table = tables[fields.Target_Role];
    if (table) {
      readAll_(table).filter(function(r){ return r.Status === 'Active' && r.Email; }).forEach(function(r){ recipients.push(r.Email); });
    }
  }

  var html = emailWrapper_('<h3>' + fields.Title + '</h3><p>' + fields.Message + '</p>');
  var sent = 0;
  recipients.forEach(function(email) {
    if (sendEmail_(email, fields.Title, html)) sent++;
  });
  logAudit_(actor.sub, actor.role, 'ANNOUNCEMENT', 'Notifications', Utilities.getUuid(), null, { recipients: sent, title: fields.Title });
  return { sent: sent };
}

function listNotifications_(filters, actor) {
  var notifs = readAll_('Notifications');
  if (filters && filters.type)   notifs = notifs.filter(function(n){ return n.Type === filters.type; });
  if (filters && filters.status) notifs = notifs.filter(function(n){ return n.Status === filters.status; });
  return notifs.slice(-100); // last 100
}

// ================================================================
// SECTION 7 — TRIGGERS (run these once from Apps Script editor)
// ================================================================

/** Run once: setupDailyTriggers() to create automatic daily jobs */
function setupDailyTriggers() {
  // Remove existing triggers
  ScriptApp.getProjectTriggers().forEach(function(t){ ScriptApp.deleteTrigger(t); });

  // Attendance alerts — run every day at 8 PM
  ScriptApp.newTrigger('runAttendanceAlerts').timeBased().everyDays(1).atHour(20).create();

  // Fee reminders — run every day at 9 AM
  ScriptApp.newTrigger('runFeeReminders').timeBased().everyDays(1).atHour(9).create();

  // Auto-close expired attendance sessions — run every 30 minutes
  ScriptApp.newTrigger('autoCloseExpiredSessions').timeBased().everyMinutes(30).create();

  Logger.log('Daily triggers created successfully.');
  return true;
}
