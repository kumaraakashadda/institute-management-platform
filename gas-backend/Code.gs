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
      case 'rescheduleInstallment':
        return ok_(rescheduleInstallment_(data.installment_id, data.new_due_date, data.reason, actor));
      case 'mergeInstallments':
        return ok_(mergeInstallments_(data.ids, actor));
      case 'splitInstallment':
        return ok_(splitInstallment_(data.installment_id, data.amounts, data.dates, actor));

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

      default:
        return fail_('Unknown action: ' + action, 'NOT_FOUND');
    }
  } catch (err) {
    logSystem_('ERROR', err.message + (err.stack ? '\n' + err.stack : ''), 'handleRequest_:' + action);
    return fail_(err.message, 'ERROR');
  }
}
