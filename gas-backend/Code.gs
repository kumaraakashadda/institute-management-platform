/**
 * Code.gs  —  Milestone 3 (Fee Management)
 * -----------------------------------------------------------------------
 * REPLACES the Milestone 2 Code.gs entirely.
 * All M2 routes are preserved below. M3 fee routes are added underneath.
 *
 * CORS note (unchanged from M2):
 * Every write uses POST with Content-Type: text/plain.
 * Body: { action, token, data }
 * Reads may use GET with ?action=...&token=...&data=... (JSON-encoded data).
 * -----------------------------------------------------------------------
 */

var PUBLIC_ACTIONS = ['login', 'ping'];

function doGet(e) {
  var data = {};
  try { if (e.parameter.data) data = JSON.parse(e.parameter.data); } catch(err) {}
  return handleRequest_(e.parameter.action, data, e.parameter.token);
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {
    return fail_('Request body must be valid JSON.', 'BAD_REQUEST');
  }
  return handleRequest_(body.action, body.data || {}, body.token);
}

function handleRequest_(action, data, token) {
  try {
    if (!action) return fail_('Missing "action".', 'BAD_REQUEST');

    var actor = null;
    if (PUBLIC_ACTIONS.indexOf(action) === -1) {
      actor = verifyJwt_(token);
    }

    switch (action) {

      // ── System ──────────────────────────────────────────────────────────
      case 'ping':
        return ok_({ status: 'alive', time: new Date().toISOString() });

      // ── Auth ─────────────────────────────────────────────────────────────
      case 'login':
        return ok_(login_(data.identifier, data.password));
      case 'changePassword':
        changePassword_(actor, data.oldPassword, data.newPassword);
        return ok_({ changed: true });

      // ── Master data ───────────────────────────────────────────────────────
      case 'listMasterData':
        return ok_(listMasterData_(data.table));
      case 'createMasterData':
        return ok_(createMasterData_(data.table, data.fields, actor));
      case 'updateMasterData':
        return ok_(updateMasterData_(data.table, data.id, data.patch, actor));
      case 'deleteMasterData':
        return ok_(deleteMasterData_(data.table, data.id, actor));

      // ── Staff ─────────────────────────────────────────────────────────────
      case 'createStaff':
        return ok_(createStaff_(data.staffType, data.fields, actor));

      // ── Admissions ────────────────────────────────────────────────────────
      case 'createAdmission':
        return ok_(createAdmission_(data.fields, actor));

      // ── Settings & Feature Flags ──────────────────────────────────────────
      case 'listSettings':
        return ok_(listSettings_());
      case 'updateSetting':
        return ok_(updateSetting_(data.key, data.value, actor));
      case 'listFeatureFlags':
        return ok_(listFeatureFlags_());
      case 'toggleFeatureFlag':
        return ok_(toggleFeatureFlag_(data.key, data.enabled, actor));

      // ── Fee Plans ─────────────────────────────────────────────────────────
      case 'listFeePlans':
        return ok_(listFeePlans_(data.filters));
      case 'createFeePlan':
        return ok_(createFeePlan_(data.fields, actor));
      case 'updateFeePlan':
        return ok_(updateFeePlan_(data.id, data.patch, actor));
      case 'deleteFeePlan':
        return ok_(deleteFeePlan_(data.id, actor));

      // ── Student Fees ──────────────────────────────────────────────────────
      case 'assignFeePlan':
        return ok_(assignFeePlan_(data.student_id, data.plan_id, data.overrides || {}, actor));
      case 'getStudentFeeProfile':
        return ok_(getStudentFeeProfile_(data.student_id));
      case 'getMyFeeProfile':
        return ok_(getMyFeeProfile_(actor));

      // ── Installments ──────────────────────────────────────────────────────
      case 'listInstallments':
        return ok_(listInstallments_(data.student_id, actor));
      case 'createInstallment':
        return ok_(createInstallment_(data.student_id, data.fields, actor));
      case 'updateInstallment':
        return ok_(updateInstallment_(data.installment_id, data.patch, actor));
      case 'deleteInstallment':
        return ok_(deleteInstallment_(data.installment_id, actor));
      case 'rescheduleInstallment':
        return ok_(rescheduleInstallment_(data.installment_id, data.new_due_date, data.reason, actor));
      case 'mergeInstallments':
        return ok_(mergeInstallments_(data.ids, actor));
      case 'splitInstallment':
        return ok_(splitInstallment_(data.installment_id, data.amounts, data.dates, actor));

      // ── Audit Log ─────────────────────────────────────────────────────────
      case 'getAuditLog':
        return ok_(getAuditLog_(data.filters, actor));

      // ── Payments ──────────────────────────────────────────────────────────
      case 'recordPayment':
        return ok_(recordPayment_(data, actor));

      // ── Admin Dashboard ───────────────────────────────────────────────────
      case 'getAdminDashboard':
        return ok_(getAdminDashboard_(actor));

      // ── Fee Dashboard ─────────────────────────────────────────────────────
      case 'getFeeDashboard':
        return ok_(getFeeDashboard_(data.filters, actor));

      // ── Fee Calendar ──────────────────────────────────────────────────────
      case 'getFeeCalendar':
        return ok_(getFeeCalendar_(data.year, data.month, data.filters, actor));

      // ── CRM Pipeline ──────────────────────────────────────────────────────
      case 'getCrmPipeline':
        return ok_(getCrmPipeline_(data.filters, actor));
      case 'updateCrmStage':
        return ok_(updateCrmStage_(data.student_id, data.stage, data.note, data.next_followup, actor));

      // ── Reports ───────────────────────────────────────────────────────────
      case 'getDailyCollectionReport':
        return ok_(getDailyCollectionReport_(data.date, actor));
      case 'getMonthlyCollectionReport':
        return ok_(getMonthlyCollectionReport_(data.year, data.month, actor));
      case 'getOverdueReport':
        return ok_(getOverdueReport_(data.filters, actor));


      // ── Attendance ────────────────────────────────────────────────────────
      case 'createSession':
        return ok_(createAttendanceSession_(data.fields, actor));
      case 'getSession':
        return ok_(getSession_(data.session_id, actor));
      case 'listSessions':
        return ok_(listSessions_(data.filters, actor));
      case 'getActiveSessions':
        return ok_(getActiveSessions_(actor));
      case 'closeSession':
        return ok_(closeSession_(data.session_id, actor));
      case 'refreshQrToken':
        return ok_(refreshQrToken_(data.session_id, actor));
      case 'recordAttendance':
        return ok_(recordAttendance_(data.scan_data, data.device_info || {}, actor));
      case 'correctAttendance':
        return ok_(correctAttendance_(data.session_id, data.student_id, data.status, data.reason, actor));
      case 'listCorrections':
        return ok_(listCorrections_(data.filters, actor));
      case 'submitLeaveRequest':
        return ok_(submitLeaveRequest_(data.fields, actor));
      case 'processLeaveRequest':
        return ok_(processLeaveRequest_(data.leave_id, data.action, actor));
      case 'listLeaveRequests':
        return ok_(listLeaveRequests_(data.filters, actor));
      case 'getAttendanceDashboard':
        return ok_(getAttendanceDashboard_(data.filters, actor));
      case 'getAttendanceCalendar':
        return ok_(getAttendanceCalendar_(data.year, data.month, data.filters, actor));
      case 'getSubjectWiseReport':
        return ok_(getSubjectWiseReport_(data.filters, actor));
      case 'getDefaulters':
        return ok_(getDefaulters_(data.filters, actor));
      case 'getMonthlyAttendanceSummary':
        return ok_(getMonthlyAttendanceSummary_(data.year, data.month, data.filters, actor));
      case 'getMyAttendance':
        return ok_(getMyAttendance_(actor));

      // ── Extended Fee & Search routes ─────────────────────────────────────────
      case 'generateReceipt':
        return ok_(generateReceipt_(data.payment_id, actor));
      case 'getCounsellorReport':
        return ok_(getCounsellorReport_(data.filters, actor));
      case 'searchStudents':
        return ok_(searchStudents_(data.query, data.filters, actor));
      case 'getBatchPerformance':
        return ok_(getBatchPerformance_(data.filters, actor));
      case 'getTeacherRanking':
        return ok_(getTeacherRanking_(data.filters, actor));
      case 'getStudentLedger':
        return ok_(getStudentLedger_(data.student_id, actor));
      case 'assignFeePlanToStudent':
        return ok_(assignFeePlanToStudent_(data.student_id, data.plan_id, data.overrides, actor));

      // ── Notifications ────────────────────────────────────────────────────────
      case 'sendAnnouncement':
        return ok_(sendAnnouncement_(data.fields, actor));
      case 'listNotifications':
        return ok_(listNotifications_(data.filters, actor));
      case 'runAttendanceAlerts':
        requireRole_(actor, [ROLES.SUPER_ADMIN]);
        return ok_(runAttendanceAlerts());
      case 'runFeeReminders':
        requireRole_(actor, [ROLES.SUPER_ADMIN]);
        return ok_(runFeeReminders());

      default:
        return fail_('Unknown action: ' + action, 'NOT_FOUND');
    }
  } catch (err) {
    logSystem_('ERROR', err.message + (err.stack ? '\n' + err.stack : ''), 'handleRequest_:' + action);
    return fail_(err.message, 'ERROR');
  }
}
