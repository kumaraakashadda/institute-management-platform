/**
 * FeeMgmt.gs
 * -----------------------------------------------------------------------
 * Complete Fee Management backend for Milestone 3.
 *
 * Covers:
 *   • Fee Plans  — create / list / update / delete
 *   • Student Fees  — assign plan, auto-generate installments, auto-calc
 *   • Installments — list, reschedule, merge, split, manual override
 *   • Payments     — record, auto-update totals, generate receipt number
 *   • Dashboard    — summary cards with centre/course/status filters
 *   • Calendar     — per-date due list with colour-code metadata
 *   • CRM pipeline — kanban stage management + follow-up log
 *   • Reports      — daily/monthly/centre/counsellor/overdue collections
 *
 * Permission matrix (enforced server-side on every call):
 *   Read   : SUPER_ADMIN, REGIONAL_MANAGER, CENTRE_MANAGER, COUNSELLOR
 *   Write  : SUPER_ADMIN, CENTRE_MANAGER, COUNSELLOR
 *   Delete : SUPER_ADMIN only
 * -----------------------------------------------------------------------
 */

// ---- Permission sets ----
var FEE_READ_ROLES  = [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER, ROLES.COUNSELLOR];
var FEE_WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER, ROLES.COUNSELLOR];
var FEE_DELETE_ROLES = [ROLES.SUPER_ADMIN];

// ---- Student self-service (read own data only) ----
var FEE_STUDENT_ROLES = [ROLES.STUDENT, ROLES.PARENT];

// ================================================================
// SECTION 1 — FEE PLANS
// ================================================================

function listFeePlans_(filters) {
  var rows = readAll_('Fee_Plans').filter(function(r){ return r.Status !== 'Deleted'; });
  if (filters && filters.course)      rows = rows.filter(function(r){ return r.Course === filters.course; });
  if (filters && filters.segment)     rows = rows.filter(function(r){ return r.Segment === filters.segment; });
  if (filters && filters.target_year) rows = rows.filter(function(r){ return r.Target_Year === filters.target_year; });
  if (filters && filters.status)      rows = rows.filter(function(r){ return r.Status === filters.status; });
  return rows;
}

function createFeePlan_(fields, actor) {
  requireRole_(actor, FEE_WRITE_ROLES);
  var required = ['Plan_Name','Course','Total_Fee','No_Of_Installments'];
  required.forEach(function(f){ if (!fields[f]) throw new Error('Missing required field: ' + f); });
  return withLock_(function(){
    var id = nextId_('Fee_Plans','FP','Plan_ID');
    var record = Object.assign({}, fields);
    record.Plan_ID = id;
    record.Status  = record.Status || 'Active';
    record.Registration_Fee = record.Registration_Fee || 0;
    appendRow_('Fee_Plans', record);
    logAudit_(actor.sub, actor.role, 'CREATE', 'Fee_Plans', id, null, record);
    return record;
  });
}

function updateFeePlan_(id, patch, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN]);
  return withLock_(function(){
    var row = findOne_('Fee_Plans','Plan_ID', id);
    if (!row) throw new Error('Fee plan ' + id + ' not found.');
    var updated = updateRow_('Fee_Plans', row._row, patch);
    logAudit_(actor.sub, actor.role, 'UPDATE', 'Fee_Plans', id, row, updated);
    return updated;
  });
}

function deleteFeePlan_(id, actor) {
  requireRole_(actor, FEE_DELETE_ROLES);
  return withLock_(function(){
    var row = findOne_('Fee_Plans','Plan_ID', id);
    if (!row) throw new Error('Fee plan ' + id + ' not found.');
    softDeleteRow_('Fee_Plans', row._row);
    logAudit_(actor.sub, actor.role, 'DELETE', 'Fee_Plans', id, row, null);
    return true;
  });
}

// ================================================================
// SECTION 2 — STUDENT FEES (assign plan + auto-generate installments)
// ================================================================

/**
 * Assigns a fee plan to a student and auto-generates the full
 * installment schedule. Safe to call multiple times — if a fee
 * record already exists it updates in-place and regenerates
 * installments only if explicitly requested.
 */
function assignFeePlan_(studentId, planId, overrides, actor) {
  requireRole_(actor, FEE_WRITE_ROLES);

  return withLock_(function(){
    var student = findOne_('Students','Student_ID', studentId);
    if (!student) throw new Error('Student ' + studentId + ' not found.');
    var plan = findOne_('Fee_Plans','Plan_ID', planId);
    if (!plan) throw new Error('Fee plan ' + planId + ' not found.');

    var discount    = Number(overrides.discount    || 0);
    var scholarship = Number(overrides.scholarship || 0);
    var totalFee    = Number(plan.Total_Fee);
    var netFee      = Math.max(0, totalFee - discount - scholarship);
    var regFee      = Number(overrides.registration_fee_paid || plan.Registration_Fee || 0);
    var startDate   = overrides.start_date || new Date().toISOString().split('T')[0];

    // Upsert Student_Fees row
    var existing = findOne_('Student_Fees','Student_ID', studentId);
    var feeRecord = {
      Student_ID:            studentId,
      Student_Name:          student.Full_Name,
      Admission_ID:          student.Admission_ID,
      Centre:                student.Centre,
      Course:                student.Course,
      Segment:               student.Segment,
      Target_Year:           student.Target_Year,
      Fee_Plan:              planId,
      Total_Fee:             totalFee,
      Discount:              discount,
      Scholarship:           scholarship,
      Net_Fee:               netFee,
      Registration_Fee_Paid: regFee,
      Total_Paid:            regFee,
      Pending_Amount:        netFee - regFee,
      Last_Payment_Date:     regFee > 0 ? startDate : '',
      Payment_Status:        regFee >= netFee ? 'Paid' : regFee > 0 ? 'Partial' : 'Pending',
      Created_Date:          existing ? existing.Created_Date : new Date().toISOString(),
      Updated_Date:          new Date().toISOString()
    };

    if (existing) {
      updateRow_('Student_Fees', existing._row, feeRecord);
    } else {
      appendRow_('Student_Fees', feeRecord);
    }

    // Generate fresh installment schedule
    generateInstallments_(studentId, plan, netFee, regFee, startDate, overrides.installment_dates);

    logAudit_(actor.sub, actor.role, 'ASSIGN_FEE_PLAN', 'Student_Fees', studentId, existing, feeRecord);
    return getStudentFeeProfile_(studentId);
  });
}

/**
 * Builds the installment schedule for a student. Distributes the
 * net fee (minus registration fee already paid) evenly across the
 * number of installments defined in the plan, with optional custom dates.
 */
function generateInstallments_(studentId, plan, netFee, regPaid, startDate, customDates) {
  var n     = Number(plan.No_Of_Installments);
  var remaining = netFee - regPaid;
  if (remaining <= 0) return; // fully paid via registration fee — no installments needed

  // Remove any existing draft installments (keep paid ones)
  var existing = readAll_('Fee_Installments').filter(function(r){
    return String(r.Student_ID) === String(studentId);
  });
  existing.forEach(function(r){
    if (r.Status !== 'Paid') softDeleteRow_('Fee_Installments', r._row);
  });

  var base       = Math.floor(remaining / n);
  var lastExtra  = remaining - base * (n - 1);  // last installment absorbs rounding
  var start      = new Date(startDate);

  for (var i = 0; i < n; i++) {
    var amount  = (i === n - 1) ? lastExtra : base;
    var dueDate;
    if (customDates && customDates[i]) {
      dueDate = customDates[i];
    } else {
      var d = new Date(start);
      d.setMonth(d.getMonth() + i + 1);
      dueDate = d.toISOString().split('T')[0];
    }
    var instId = nextId_('Fee_Installments','INS','Installment_ID');
    appendRow_('Fee_Installments', {
      Installment_ID:      instId,
      Student_ID:          studentId,
      Installment_Number:  i + 1,
      Due_Date:            dueDate,
      Installment_Amount:  amount,
      Paid_Amount:         0,
      Pending_Amount:      amount,
      Payment_Date:        '',
      Payment_Mode:        '',
      Transaction_Reference: '',
      Status:              'Pending',
      Remarks:             ''
    });
  }
}

function getStudentFeeProfile_(studentId) {
  var fee   = findOne_('Student_Fees','Student_ID', studentId);
  if (!fee) return null;
  var insts = readAll_('Fee_Installments').filter(function(r){
    return String(r.Student_ID) === String(studentId) && r.Status !== 'Deleted';
  });
  var payments = readAll_('Fee_Payments').filter(function(r){
    return String(r.Student_ID) === String(studentId);
  });
  var today = new Date(); today.setHours(0,0,0,0);

  var timeline = buildTimeline_(fee, insts, payments);

  return {
    fee: fee,
    installments: insts.map(function(inst){
      var due = new Date(inst.Due_Date); due.setHours(0,0,0,0);
      var daysOverdue = inst.Status !== 'Paid' ? Math.max(0, Math.floor((today - due) / 86400000)) : 0;
      var colour = colourCode_(inst.Status, due, today);
      return Object.assign({}, inst, { days_overdue: daysOverdue, colour: colour });
    }),
    payments: payments,
    timeline: timeline,
    summary: {
      total_fee:       Number(fee.Total_Fee),
      discount:        Number(fee.Discount),
      scholarship:     Number(fee.Scholarship),
      net_fee:         Number(fee.Net_Fee),
      total_paid:      Number(fee.Total_Paid),
      pending:         Number(fee.Pending_Amount),
      collection_pct:  fee.Net_Fee > 0 ? Math.round(Number(fee.Total_Paid) / Number(fee.Net_Fee) * 100) : 0,
      next_due:        nextDueInstallment_(insts),
      overdue_count:   insts.filter(function(r){ return r.Status === 'Overdue' || (r.Status === 'Pending' && new Date(r.Due_Date) < today); }).length
    }
  };
}

function colourCode_(status, dueDate, today) {
  if (status === 'Paid') return 'green';
  var diff = Math.floor((dueDate - today) / 86400000);
  if (diff < 0)  return 'red';      // overdue
  if (diff === 0) return 'yellow';  // due today
  if (diff <= 7)  return 'orange';  // due within 7 days
  return 'blue';                    // upcoming
}

function nextDueInstallment_(insts) {
  var pending = insts.filter(function(r){ return r.Status !== 'Paid' && r.Status !== 'Deleted'; });
  pending.sort(function(a,b){ return new Date(a.Due_Date) - new Date(b.Due_Date); });
  return pending[0] || null;
}

function buildTimeline_(fee, insts, payments) {
  var events = [];
  if (fee.Created_Date) events.push({ date: fee.Created_Date, type: 'admission', label: 'Admission Recorded' });
  if (Number(fee.Registration_Fee_Paid) > 0) events.push({ date: fee.Created_Date, type: 'reg_paid', label: 'Registration Fee Paid: ₹' + fee.Registration_Fee_Paid });
  insts.forEach(function(inst){
    if (inst.Status === 'Paid') {
      events.push({ date: inst.Payment_Date, type: 'paid', label: 'Installment ' + inst.Installment_Number + ' Paid: ₹' + inst.Paid_Amount });
    } else {
      events.push({ date: inst.Due_Date, type: inst.Status === 'Pending' ? 'due' : 'overdue', label: 'Installment ' + inst.Installment_Number + ' Due: ₹' + inst.Installment_Amount });
    }
  });
  payments.forEach(function(p){
    events.push({ date: p.Payment_Date, type: 'payment', label: 'Payment Received: ₹' + p.Amount + ' via ' + p.Payment_Mode });
  });
  events.sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
  return events;
}

// ================================================================
// SECTION 3 — INSTALLMENT MANAGEMENT
// ================================================================

function listInstallments_(studentId, actor) {
  requireRole_(actor, FEE_READ_ROLES.concat(FEE_STUDENT_ROLES));
  if (actor.role === ROLES.STUDENT && actor.sub !== studentId)
    throw new Error('Students can only view their own installments.');
  if (actor.role === ROLES.PARENT) {
    var parent = findOne_('Parents','Parent_ID', actor.sub);
    if (!parent || String(parent.Student_IDs).indexOf(studentId) === -1)
      throw new Error('Parents can only view their own child\'s installments.');
  }
  return readAll_('Fee_Installments').filter(function(r){
    return String(r.Student_ID) === String(studentId) && r.Status !== 'Deleted';
  });
}

function rescheduleInstallment_(installmentId, newDueDate, reason, actor) {
  requireRole_(actor, FEE_WRITE_ROLES);
  return withLock_(function(){
    var row = findOne_('Fee_Installments','Installment_ID', installmentId);
    if (!row) throw new Error('Installment ' + installmentId + ' not found.');
    if (row.Status === 'Paid') throw new Error('Cannot reschedule a paid installment.');
    var updated = updateRow_('Fee_Installments', row._row, {
      Due_Date: newDueDate,
      Remarks: (row.Remarks ? row.Remarks + ' | ' : '') + 'Rescheduled: ' + reason
    });
    logAudit_(actor.sub, actor.role, 'RESCHEDULE', 'Fee_Installments', installmentId, row, updated);
    return updated;
  });
}

function mergeInstallments_(ids, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN]);
  return withLock_(function(){
    var rows = ids.map(function(id){
      var r = findOne_('Fee_Installments','Installment_ID', id);
      if (!r) throw new Error('Installment ' + id + ' not found.');
      if (r.Status === 'Paid') throw new Error('Cannot merge paid installment ' + id);
      return r;
    });
    var totalAmount = rows.reduce(function(s,r){ return s + Number(r.Installment_Amount); }, 0);
    var earliestDue = rows.reduce(function(min,r){ return r.Due_Date < min ? r.Due_Date : min; }, rows[0].Due_Date);
    // Keep the first, remove the rest
    var kept = rows[0];
    updateRow_('Fee_Installments', kept._row, { Installment_Amount: totalAmount, Pending_Amount: totalAmount, Due_Date: earliestDue, Remarks: 'Merged from: ' + ids.join(', ') });
    rows.slice(1).forEach(function(r){ softDeleteRow_('Fee_Installments', r._row); });
    logAudit_(actor.sub, actor.role, 'MERGE', 'Fee_Installments', ids.join(','), rows, null);
    return findOne_('Fee_Installments','Installment_ID', kept.Installment_ID);
  });
}

function splitInstallment_(installmentId, splitAmounts, splitDates, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN]);
  return withLock_(function(){
    var row = findOne_('Fee_Installments','Installment_ID', installmentId);
    if (!row) throw new Error('Installment ' + installmentId + ' not found.');
    if (row.Status === 'Paid') throw new Error('Cannot split a paid installment.');
    var total = splitAmounts.reduce(function(s,a){ return s + Number(a); }, 0);
    if (Math.abs(total - Number(row.Installment_Amount)) > 1) throw new Error('Split amounts must sum to the original installment amount (₹' + row.Installment_Amount + ').');
    softDeleteRow_('Fee_Installments', row._row);
    var newIds = [];
    splitAmounts.forEach(function(amount, i){
      var id = nextId_('Fee_Installments','INS','Installment_ID');
      appendRow_('Fee_Installments', Object.assign({}, row, {
        Installment_ID: id, Installment_Amount: amount, Pending_Amount: amount,
        Due_Date: splitDates[i] || row.Due_Date, Status: 'Pending', Remarks: 'Split from ' + installmentId
      }));
      newIds.push(id);
    });
    logAudit_(actor.sub, actor.role, 'SPLIT', 'Fee_Installments', installmentId, row, { new_ids: newIds });
    return newIds;
  });
}

// ================================================================
// SECTION 4 — PAYMENT RECORDING
// ================================================================

/**
 * Records a payment, updates the installment status, recalculates
 * the Student_Fees totals, and returns a receipt number.
 * All in one atomic (locked) transaction.
 */
function recordPayment_(fields, actor) {
  requireRole_(actor, FEE_WRITE_ROLES);
  var required = ['Student_ID','Amount','Payment_Mode'];
  required.forEach(function(f){ if (!fields[f]) throw new Error('Missing field: ' + f); });

  return withLock_(function(){
    var studentId   = fields.Student_ID;
    var amount      = Number(fields.Amount);
    var today       = new Date().toISOString().split('T')[0];
    var paymentId   = nextId_('Fee_Payments','PAY','Payment_ID');
    var receiptNo   = generateReceiptNumber_();

    // 1. Save the payment record
    var payment = {
      Payment_ID:       paymentId,
      Student_ID:       studentId,
      Receipt_Number:   receiptNo,
      Payment_Date:     fields.Payment_Date || today,
      Amount:           amount,
      Payment_Mode:     fields.Payment_Mode,
      Transaction_ID:   fields.Transaction_ID || '',
      Collected_By:     actor.sub,
      Remarks:          fields.Remarks || '',
      Receipt_Generated: false,
      Timestamp:        new Date().toISOString()
    };
    appendRow_('Fee_Payments', payment);

    // 2. Apply payment to outstanding installments (oldest first)
    var remaining = amount;
    var insts = readAll_('Fee_Installments')
      .filter(function(r){ return String(r.Student_ID) === String(studentId) && r.Status !== 'Paid' && r.Status !== 'Deleted'; })
      .sort(function(a,b){ return new Date(a.Due_Date) - new Date(b.Due_Date); });

    insts.forEach(function(inst){
      if (remaining <= 0) return;
      var pending = Number(inst.Pending_Amount);
      var applying = Math.min(remaining, pending);
      var newPaid  = Number(inst.Paid_Amount) + applying;
      var newPending = pending - applying;
      var newStatus  = newPending <= 0 ? 'Paid' : 'Partial';
      updateRow_('Fee_Installments', inst._row, {
        Paid_Amount:    newPaid,
        Pending_Amount: newPending,
        Payment_Date:   fields.Payment_Date || today,
        Payment_Mode:   fields.Payment_Mode,
        Transaction_Reference: fields.Transaction_ID || '',
        Status:         newStatus,
        Remarks:        (inst.Remarks ? inst.Remarks + ' | ' : '') + 'Payment: ' + paymentId
      });
      remaining -= applying;
    });

    // 3. Recalculate Student_Fees totals
    recalcStudentFees_(studentId);

    logAudit_(actor.sub, actor.role, 'PAYMENT', 'Fee_Payments', paymentId, null, payment);
    return { payment: payment, receipt_number: receiptNo };
  });
}

function generateReceiptNumber_() {
  var prefix = 'RCP';
  var dateStr = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  var seq = readAll_('Fee_Payments').length + 1;
  return prefix + dateStr + ('0000' + seq).slice(-4);
}

/** Recalculates Total_Paid, Pending_Amount, Payment_Status on Student_Fees
 *  from the live installment and payment data. Called after every payment. */
function recalcStudentFees_(studentId) {
  var feeRow = findOne_('Student_Fees','Student_ID', studentId);
  if (!feeRow) return;

  var insts    = readAll_('Fee_Installments').filter(function(r){ return String(r.Student_ID) === String(studentId) && r.Status !== 'Deleted'; });
  var payments = readAll_('Fee_Payments').filter(function(r){ return String(r.Student_ID) === String(studentId); });

  var totalPaid = payments.reduce(function(s,r){ return s + Number(r.Amount); }, 0) + Number(feeRow.Registration_Fee_Paid);
  var netFee    = Number(feeRow.Net_Fee);
  var pending   = Math.max(0, netFee - totalPaid);
  var status    = totalPaid >= netFee ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending';
  var lastPay   = payments.length > 0 ? payments[payments.length - 1].Payment_Date : feeRow.Last_Payment_Date;

  updateRow_('Student_Fees', feeRow._row, {
    Total_Paid:       totalPaid,
    Pending_Amount:   pending,
    Payment_Status:   status,
    Last_Payment_Date: lastPay,
    Updated_Date:     new Date().toISOString()
  });
}

// ================================================================
// SECTION 5 — FEE DASHBOARD SUMMARY
// ================================================================

function getFeeDashboard_(filters, actor) {
  requireRole_(actor, FEE_READ_ROLES);

  var allFees = readAll_('Student_Fees');
  var allPayments = readAll_('Fee_Payments');
  var allInsts = readAll_('Fee_Installments').filter(function(r){ return r.Status !== 'Deleted'; });
  var today = new Date(); today.setHours(0,0,0,0);
  var todayStr = today.toISOString().split('T')[0];
  var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Apply centre filter for non-super-admin roles
  if (actor.role === ROLES.CENTRE_MANAGER || actor.role === ROLES.COUNSELLOR) {
    allFees = allFees.filter(function(r){ return r.Centre === actor.centre; });
  }
  if (filters && filters.centre && actor.role !== ROLES.CENTRE_MANAGER) {
    allFees = allFees.filter(function(r){ return r.Centre === filters.centre; });
  }
  if (filters && filters.course)       allFees = allFees.filter(function(r){ return r.Course === filters.course; });
  if (filters && filters.segment)      allFees = allFees.filter(function(r){ return r.Segment === filters.segment; });
  if (filters && filters.target_year)  allFees = allFees.filter(function(r){ return r.Target_Year === filters.target_year; });
  if (filters && filters.payment_status) allFees = allFees.filter(function(r){ return r.Payment_Status === filters.payment_status; });

  var studentIds = allFees.map(function(r){ return String(r.Student_ID); });
  var filteredPayments = allPayments.filter(function(r){ return studentIds.indexOf(String(r.Student_ID)) !== -1; });
  var filteredInsts    = allInsts.filter(function(r){ return studentIds.indexOf(String(r.Student_ID)) !== -1; });

  var totalFees     = allFees.reduce(function(s,r){ return s + Number(r.Net_Fee); }, 0);
  var totalCollected= allFees.reduce(function(s,r){ return s + Number(r.Total_Paid); }, 0);
  var totalPending  = allFees.reduce(function(s,r){ return s + Number(r.Pending_Amount); }, 0);

  var todayCollection = filteredPayments
    .filter(function(r){ return String(r.Payment_Date).slice(0,10) === todayStr; })
    .reduce(function(s,r){ return s + Number(r.Amount); }, 0);

  var monthCollection = filteredPayments
    .filter(function(r){ return new Date(r.Payment_Date) >= monthStart; })
    .reduce(function(s,r){ return s + Number(r.Amount); }, 0);

  var upcomingDues  = filteredInsts.filter(function(r){
    var d = new Date(r.Due_Date); d.setHours(0,0,0,0);
    var diff = Math.floor((d - today) / 86400000);
    return r.Status !== 'Paid' && diff >= 0 && diff <= 7;
  }).length;

  var overdueInsts  = filteredInsts.filter(function(r){
    var d = new Date(r.Due_Date); d.setHours(0,0,0,0);
    return r.Status !== 'Paid' && d < today;
  }).length;

  var overdueAmount = filteredInsts
    .filter(function(r){ var d = new Date(r.Due_Date); d.setHours(0,0,0,0); return r.Status !== 'Paid' && d < today; })
    .reduce(function(s,r){ return s + Number(r.Pending_Amount); }, 0);

  var studentsWithPending = allFees.filter(function(r){ return Number(r.Pending_Amount) > 0; }).length;
  var collectionPct = totalFees > 0 ? Math.round(totalCollected / totalFees * 100) : 0;

  // Status breakdown
  var statusBreakdown = { Paid: 0, Partial: 0, Pending: 0 };
  allFees.forEach(function(r){ if (statusBreakdown[r.Payment_Status] !== undefined) statusBreakdown[r.Payment_Status]++; });

  return {
    cards: {
      total_fees: totalFees,
      total_collected: totalCollected,
      total_pending: totalPending,
      today_collection: todayCollection,
      month_collection: monthCollection,
      upcoming_dues_count: upcomingDues,
      overdue_installments: overdueInsts,
      overdue_amount: overdueAmount,
      students_with_pending: studentsWithPending,
      collection_pct: collectionPct,
      total_students: allFees.length
    },
    status_breakdown: statusBreakdown
  };
}

// ================================================================
// SECTION 6 — FEE CALENDAR
// ================================================================

/**
 * Returns all installment due dates for a given month/year,
 * enriched with student details and colour-coding for the calendar UI.
 */
function getFeeCalendar_(year, month, filters, actor) {
  requireRole_(actor, FEE_READ_ROLES);

  var monthStr = String(year) + '-' + ('0' + month).slice(-2);
  var today    = new Date(); today.setHours(0,0,0,0);

  var allInsts = readAll_('Fee_Installments').filter(function(r){
    return r.Status !== 'Deleted' && String(r.Due_Date).slice(0,7) === monthStr;
  });

  // Join with Student_Fees for student details
  var feeMap = {};
  readAll_('Student_Fees').forEach(function(r){ feeMap[r.Student_ID] = r; });

  // Join with Students for phone
  var stuMap = {};
  readAll_('Students').forEach(function(r){ stuMap[r.Student_ID] = r; });

  var result = allInsts.map(function(inst){
    var fee = feeMap[inst.Student_ID] || {};
    var stu = stuMap[inst.Student_ID] || {};
    var due = new Date(inst.Due_Date); due.setHours(0,0,0,0);
    var daysOverdue = inst.Status !== 'Paid' ? Math.max(0, Math.floor((today - due) / 86400000)) : 0;

    // Apply filters
    if (filters && filters.centre && fee.Centre !== filters.centre) return null;
    if (filters && filters.course && fee.Course !== filters.course) return null;
    if (filters && filters.status && inst.Status !== filters.status) return null;

    return {
      date:             inst.Due_Date,
      installment_id:   inst.Installment_ID,
      installment_no:   inst.Installment_Number,
      student_id:       inst.Student_ID,
      student_name:     fee.Student_Name,
      phone:            stu.Phone,
      centre:           fee.Centre,
      course:           fee.Course,
      batch:            stu.Batch,
      due_amount:       Number(inst.Installment_Amount),
      pending_amount:   Number(inst.Pending_Amount),
      days_overdue:     daysOverdue,
      status:           inst.Status,
      colour:           colourCode_(inst.Status, due, today),
      counsellor:       fee.Counsellor || '',
      remarks:          inst.Remarks
    };
  }).filter(Boolean);

  // Group by date for calendar rendering
  var byDate = {};
  result.forEach(function(item){
    if (!byDate[item.date]) byDate[item.date] = [];
    byDate[item.date].push(item);
  });

  return byDate;
}

// ================================================================
// SECTION 7 — CRM PIPELINE
// ================================================================

var CRM_STAGES = ['Upcoming_Due', 'Contacted', 'Promise_To_Pay', 'Partially_Paid', 'Fully_Paid', 'Not_Reachable'];

/**
 * Returns the CRM pipeline grouped by stage, with student fee details.
 * Automatically puts students into stages based on payment status
 * if no manual stage override exists.
 */
function getCrmPipeline_(filters, actor) {
  requireRole_(actor, FEE_READ_ROLES);
  var today = new Date(); today.setHours(0,0,0,0);

  var allFees = readAll_('Student_Fees');
  var allInsts = readAll_('Fee_Installments').filter(function(r){ return r.Status !== 'Deleted'; });
  var stuMap = {};
  readAll_('Students').forEach(function(r){ stuMap[r.Student_ID] = r; });
  var crmLogs = readAll_('CRM_FollowUp_Log') || [];
  var crmLogMap = {};
  crmLogs.forEach(function(r){ crmLogMap[r.Student_ID] = r; });

  // Centre filter
  if (actor.role === ROLES.CENTRE_MANAGER || actor.role === ROLES.COUNSELLOR) {
    allFees = allFees.filter(function(r){ return r.Centre === actor.centre; });
  }
  if (filters && filters.centre) allFees = allFees.filter(function(r){ return r.Centre === filters.centre; });

  var pipeline = {};
  CRM_STAGES.forEach(function(s){ pipeline[s] = []; });

  allFees.forEach(function(fee){
    var pending = Number(fee.Pending_Amount);
    if (pending <= 0 && fee.Payment_Status === 'Paid') { pipeline['Fully_Paid'].push(buildCrmCard_(fee, allInsts, stuMap, today, crmLogMap)); return; }
    if (pending <= 0) return;

    // Check overdue or upcoming
    var studentInsts = allInsts.filter(function(r){ return String(r.Student_ID) === String(fee.Student_ID) && r.Status !== 'Paid'; });
    var overdue = studentInsts.filter(function(r){ var d = new Date(r.Due_Date); d.setHours(0,0,0,0); return d < today; });
    var upcoming7 = studentInsts.filter(function(r){ var d = new Date(r.Due_Date); d.setHours(0,0,0,0); var diff = Math.floor((d - today)/86400000); return diff >= 0 && diff <= 7; });

    var log = crmLogMap[fee.Student_ID];
    var stage = log ? (log.Current_Stage || 'Upcoming_Due') : (overdue.length > 0 ? 'Upcoming_Due' : upcoming7.length > 0 ? 'Upcoming_Due' : null);
    if (!stage) return; // not in the window

    var card = buildCrmCard_(fee, allInsts, stuMap, today, crmLogMap);
    card.overdue_installments = overdue.length;
    card.overdue_amount = overdue.reduce(function(s,r){ return s + Number(r.Pending_Amount); }, 0);
    if (CRM_STAGES.indexOf(stage) !== -1) pipeline[stage].push(card);
    else pipeline['Upcoming_Due'].push(card);
  });

  return pipeline;
}

function buildCrmCard_(fee, allInsts, stuMap, today, crmLogMap) {
  var stu  = stuMap[fee.Student_ID] || {};
  var log  = crmLogMap[fee.Student_ID] || {};
  var insts = allInsts.filter(function(r){ return String(r.Student_ID) === String(fee.Student_ID) && r.Status !== 'Paid'; });
  return {
    student_id:       fee.Student_ID,
    student_name:     fee.Student_Name,
    phone:            stu.Phone,
    centre:           fee.Centre,
    course:           fee.Course,
    total_fee:        Number(fee.Net_Fee),
    total_paid:       Number(fee.Total_Paid),
    pending:          Number(fee.Pending_Amount),
    payment_status:   fee.Payment_Status,
    last_payment:     fee.Last_Payment_Date,
    next_due:         nextDueInstallment_(insts),
    crm_stage:        log.Current_Stage || 'Upcoming_Due',
    last_contacted:   log.Last_Contacted || '',
    next_followup:    log.Next_Followup_Date || '',
    follow_up_note:   log.Last_Note || ''
  };
}

function updateCrmStage_(studentId, stage, note, nextFollowup, actor) {
  requireRole_(actor, FEE_WRITE_ROLES);
  if (CRM_STAGES.indexOf(stage) === -1) throw new Error('Invalid CRM stage: ' + stage);

  return withLock_(function(){
    // CRM_FollowUp_Log is created lazily — add to schema if it's the first time
    var existing = null;
    try { existing = findOne_('CRM_FollowUp_Log','Student_ID', studentId); } catch(e) {}

    var record = {
      Student_ID:       studentId,
      Current_Stage:    stage,
      Last_Contacted:   new Date().toISOString().split('T')[0],
      Next_Followup_Date: nextFollowup || '',
      Last_Note:        note || '',
      Updated_By:       actor.sub,
      Updated_At:       new Date().toISOString()
    };

    if (existing) {
      updateRow_('CRM_FollowUp_Log', existing._row, record);
    } else {
      try {
        appendRow_('CRM_FollowUp_Log', record);
      } catch(e) {
        // Sheet might not exist yet — create it
        var ss = getSpreadsheet_();
        var sh = ss.insertSheet('CRM_FollowUp_Log');
        var heads = ['Student_ID','Current_Stage','Last_Contacted','Next_Followup_Date','Last_Note','Updated_By','Updated_At'];
        sh.getRange(1,1,1,heads.length).setValues([heads]).setFontWeight('bold');
        sh.setFrozenRows(1);
        appendRow_('CRM_FollowUp_Log', record);
      }
    }
    logAudit_(actor.sub, actor.role, 'CRM_STAGE', 'CRM_FollowUp_Log', studentId, existing, record);
    return record;
  });
}

// ================================================================
// SECTION 8 — REPORTS
// ================================================================

function getDailyCollectionReport_(date, actor) {
  requireRole_(actor, FEE_READ_ROLES);
  var target = date || new Date().toISOString().split('T')[0];
  var payments = readAll_('Fee_Payments').filter(function(r){ return String(r.Payment_Date).slice(0,10) === target; });
  var feeMap = {};
  readAll_('Student_Fees').forEach(function(r){ feeMap[r.Student_ID] = r; });

  var rows = payments.map(function(p){
    var fee = feeMap[p.Student_ID] || {};
    return {
      receipt_no:    p.Receipt_Number,
      student_id:    p.Student_ID,
      student_name:  fee.Student_Name,
      centre:        fee.Centre,
      course:        fee.Course,
      amount:        Number(p.Amount),
      mode:          p.Payment_Mode,
      transaction_id: p.Transaction_ID,
      collected_by:  p.Collected_By,
      time:          p.Timestamp
    };
  });

  // Enforce centre filter for non-admin
  if (actor.role === ROLES.CENTRE_MANAGER || actor.role === ROLES.COUNSELLOR) {
    var stuFees = readAll_('Student_Fees').filter(function(r){ return r.Centre === actor.centre; });
    var ids = stuFees.map(function(r){ return r.Student_ID; });
    rows = rows.filter(function(r){ return ids.indexOf(r.student_id) !== -1; });
  }

  return {
    date:          target,
    total:         rows.reduce(function(s,r){ return s + r.amount; }, 0),
    count:         rows.length,
    by_mode:       groupByMode_(rows),
    rows:          rows
  };
}

function getMonthlyCollectionReport_(year, month, actor) {
  requireRole_(actor, FEE_READ_ROLES);
  var prefix = String(year) + '-' + ('0' + month).slice(-2);
  var payments = readAll_('Fee_Payments').filter(function(r){ return String(r.Payment_Date).slice(0,7) === prefix; });
  var feeMap = {};
  readAll_('Student_Fees').forEach(function(r){ feeMap[r.Student_ID] = r; });

  var rows = payments.map(function(p){
    var fee = feeMap[p.Student_ID] || {};
    return { receipt_no: p.Receipt_Number, student_id: p.Student_ID, student_name: fee.Student_Name, centre: fee.Centre, course: fee.Course, amount: Number(p.Amount), mode: p.Payment_Mode, date: p.Payment_Date };
  });

  if (actor.role === ROLES.CENTRE_MANAGER || actor.role === ROLES.COUNSELLOR) {
    var stuFees = readAll_('Student_Fees').filter(function(r){ return r.Centre === actor.centre; });
    var ids = stuFees.map(function(r){ return r.Student_ID; });
    rows = rows.filter(function(r){ return ids.indexOf(r.student_id) !== -1; });
  }

  return {
    year: year, month: month,
    total: rows.reduce(function(s,r){ return s + r.amount; }, 0),
    count: rows.length,
    by_centre: groupByCentre_(rows),
    by_mode: groupByMode_(rows),
    rows: rows
  };
}

function getOverdueReport_(filters, actor) {
  requireRole_(actor, FEE_READ_ROLES);
  var today = new Date(); today.setHours(0,0,0,0);
  var allInsts = readAll_('Fee_Installments').filter(function(r){
    if (r.Status === 'Paid' || r.Status === 'Deleted') return false;
    var d = new Date(r.Due_Date); d.setHours(0,0,0,0);
    return d < today;
  });
  var feeMap = {};
  readAll_('Student_Fees').forEach(function(r){ feeMap[r.Student_ID] = r; });
  var stuMap = {};
  readAll_('Students').forEach(function(r){ stuMap[r.Student_ID] = r; });

  var rows = allInsts.map(function(inst){
    var fee = feeMap[inst.Student_ID] || {};
    var stu = stuMap[inst.Student_ID] || {};
    var due = new Date(inst.Due_Date); due.setHours(0,0,0,0);
    var daysOverdue = Math.floor((today - due) / 86400000);
    return {
      student_id:     inst.Student_ID,
      student_name:   fee.Student_Name,
      phone:          stu.Phone,
      centre:         fee.Centre,
      course:         fee.Course,
      installment_no: inst.Installment_Number,
      due_date:       inst.Due_Date,
      days_overdue:   daysOverdue,
      overdue_bucket: daysOverdue <= 7 ? '1-7' : daysOverdue <= 30 ? '8-30' : '30+',
      pending_amount: Number(inst.Pending_Amount)
    };
  });

  if (actor.role === ROLES.CENTRE_MANAGER || actor.role === ROLES.COUNSELLOR) {
    rows = rows.filter(function(r){ return r.centre === actor.centre; });
  }
  if (filters && filters.centre) rows = rows.filter(function(r){ return r.centre === filters.centre; });

  rows.sort(function(a,b){ return b.days_overdue - a.days_overdue; });

  return {
    total_overdue_amount: rows.reduce(function(s,r){ return s + r.pending_amount; }, 0),
    total_students: [...new Set(rows.map(function(r){ return r.student_id; }))].length,
    buckets: {
      '1_7_days':  rows.filter(function(r){ return r.overdue_bucket === '1-7'; }),
      '8_30_days': rows.filter(function(r){ return r.overdue_bucket === '8-30'; }),
      '30_plus':   rows.filter(function(r){ return r.overdue_bucket === '30+'; })
    },
    rows: rows
  };
}

function groupByMode_(rows) {
  var result = {};
  rows.forEach(function(r){ result[r.mode] = (result[r.mode] || 0) + r.amount; });
  return result;
}

function groupByCentre_(rows) {
  var result = {};
  rows.forEach(function(r){ result[r.centre] = (result[r.centre] || 0) + r.amount; });
  return result;
}

// ================================================================
// SECTION 9 — STUDENT / PARENT SELF-SERVICE
// ================================================================

function getMyFeeProfile_(actor) {
  var studentId;
  if (actor.role === ROLES.STUDENT) {
    studentId = actor.sub;
  } else if (actor.role === ROLES.PARENT) {
    var parent = findOne_('Parents','Parent_ID', actor.sub);
    if (!parent) throw new Error('Parent account not found.');
    studentId = String(parent.Student_IDs).split(',')[0].trim();
  } else {
    throw new Error('This action is for students and parents only.');
  }
  return getStudentFeeProfile_(studentId);
}

// ================================================================
// SECTION 10 — ADMIN DASHBOARD SUMMARY
// ================================================================

function getAdminDashboard_(actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER]);

  var students    = readAll_('Students').filter(function(r){ return r.Status !== 'Deleted'; });
  var active      = students.filter(function(r){ return r.Status === 'Active'; });
  var allFees     = readAll_('Student_Fees');
  var allPayments = readAll_('Fee_Payments');
  var allSessions = [];
  try { allSessions = readAll_('Attendance_Sessions'); } catch(e) {}
  var allAdmissions = readAll_('Admission_Master');
  var today = new Date(); today.setHours(0,0,0,0);
  var todayStr = today.toISOString().split('T')[0];
  var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Centre filter for non-admins
  var filteredFees = allFees;
  if (actor.role === ROLES.CENTRE_MANAGER && actor.centre) {
    filteredFees = allFees.filter(function(r){ return r.Centre === actor.centre; });
  }

  var totalFees     = filteredFees.reduce(function(s,r){ return s + Number(r.Net_Fee||0); }, 0);
  var totalCollected = filteredFees.reduce(function(s,r){ return s + Number(r.Total_Paid||0); }, 0);
  var totalPending  = filteredFees.reduce(function(s,r){ return s + Number(r.Pending_Amount||0); }, 0);

  var monthPayments = allPayments.filter(function(r){ return new Date(r.Payment_Date) >= monthStart; });
  var monthCollection = monthPayments.reduce(function(s,r){ return s + Number(r.Amount||0); }, 0);

  var todayAdmissions = allAdmissions.filter(function(r){
    return String(r.Admission_Date||r.Created_At||'').slice(0,10) === todayStr;
  }).length;
  var monthAdmissions = allAdmissions.filter(function(r){
    return new Date(r.Admission_Date||r.Created_At||today) >= monthStart;
  }).length;

  var activeSessions = allSessions.filter(function(r){ return r.Status === 'Active'; }).length;
  var overdueStudents = filteredFees.filter(function(r){ return r.Payment_Status === 'Pending' && r.Pending_Amount > 0; }).length;
  var collectionPct  = totalFees > 0 ? Math.round(totalCollected / totalFees * 100) : 0;

  return {
    total_students:       students.length,
    active_students:      active.length,
    today_attendance_pct: 0,  // populated in M4 when attendance logs exist
    present_today:        0,
    absent_today:         0,
    active_sessions:      activeSessions,
    total_centres:        readAll_('Centres').filter(function(r){ return r.Status === 'Active'; }).length,
    fee_collected_month:  monthCollection,
    fee_pending:          totalPending,
    collection_pct:       collectionPct,
    overdue_students:     overdueStudents,
    new_admissions_month: monthAdmissions,
    today_admissions:     todayAdmissions,
  };
}

// ================================================================
// SECTION 11 — PDF RECEIPT GENERATION (Google Drive)
// ================================================================

/**
 * Generate a professional HTML receipt, convert to PDF via Drive, store in
 * Drive folder, and return a public download URL.
 * Called automatically after recordPayment_ and on-demand from student portal.
 */
function generateReceipt_(paymentId, actor) {
  var payment = findOne_('Fee_Payments', 'Payment_ID', paymentId);
  if (!payment) throw new Error('Payment not found: ' + paymentId);

  var student  = findOne_('Students',   'Student_ID', payment.Student_ID);
  var feeRec   = findOne_('Student_Fees','Student_ID', payment.Student_ID);
  var institute = getSettingVal__('INSTITUTE_NAME', 'Institute Management Platform');
  var logo      = getSettingVal__('INSTITUTE_LOGO_URL', '');

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">'
    + '<style>body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:700px;margin:auto}'
    + 'h1{color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:8px}'
    + 'table{width:100%;border-collapse:collapse;margin:16px 0}'
    + 'td,th{border:1px solid #e5e7eb;padding:10px;text-align:left}'
    + 'th{background:#f9fafb;font-weight:bold}'
    + '.amount{font-size:24px;font-weight:900;color:#10b981}'
    + '.footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;font-size:11px;color:#6b7280}'
    + '.badge{display:inline-block;background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-weight:bold;font-size:13px}'
    + '</style></head><body>'
    + '<h1>' + institute + '</h1>'
    + '<table><tr><th>Receipt Number</th><td><strong>' + payment.Receipt_Number + '</strong></td>'
    + '<th>Date</th><td>' + new Date(payment.Payment_Date || payment.Timestamp).toLocaleDateString('en-IN') + '</td></tr>'
    + '<tr><th>Student ID</th><td>' + payment.Student_ID + '</td>'
    + '<th>Student Name</th><td>' + (student ? student.Full_Name : payment.Student_ID) + '</td></tr>'
    + '<tr><th>Centre</th><td>' + (feeRec ? feeRec.Centre : '') + '</td>'
    + '<th>Course</th><td>' + (feeRec ? feeRec.Course : '') + '</td></tr>'
    + '<tr><th>Batch</th><td>' + (feeRec ? feeRec.Batch || '—' : '—') + '</td>'
    + '<th>Payment Mode</th><td>' + payment.Payment_Mode + '</td></tr>'
    + (payment.Transaction_ID ? '<tr><th>Transaction ID</th><td colspan="3">' + payment.Transaction_ID + '</td></tr>' : '')
    + '</table>'
    + '<div style="text-align:center;margin:24px 0">'
    + '<p style="color:#6b7280;font-size:13px;margin-bottom:8px">Amount Received</p>'
    + '<p class="amount">₹ ' + Number(payment.Amount).toLocaleString('en-IN') + '</p>'
    + '<span class="badge">✓ PAID</span></div>'
    + (payment.Remarks ? '<p style="color:#6b7280;font-size:12px">Remarks: ' + payment.Remarks + '</p>' : '')
    + '<div class="footer">'
    + '<p>This is a computer-generated receipt and does not require a physical signature.</p>'
    + '<p>Receipt generated: ' + new Date().toLocaleString('en-IN') + ' | ' + institute + '</p>'
    + '</div></body></html>';

  // Save as PDF in Google Drive
  var folder  = getOrCreateDriveFolder_('IMP_Receipts/' + payment.Student_ID);
  var blob    = Utilities.newBlob(html, 'text/html', 'receipt.html').getAs('application/pdf');
  blob.setName('Receipt_' + payment.Receipt_Number + '.pdf');
  var file    = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var url     = file.getDownloadUrl();

  // Update payment record with receipt URL
  withLock_(function(){
    updateRow_('Fee_Payments', payment._row, { Receipt_URL: url, Receipt_Generated: 'TRUE' });
  });

  logAudit_(actor ? actor.sub : 'system', actor ? actor.role : 'SYSTEM', 'GENERATE_RECEIPT', 'Fee_Payments', paymentId, null, { url: url });
  return { receipt_url: url, receipt_number: payment.Receipt_Number };
}

function getOrCreateDriveFolder_(path) {
  var parts  = path.split('/');
  var folder = DriveApp.getRootFolder();
  parts.forEach(function(name) {
    var iter = folder.getFoldersByName(name);
    folder   = iter.hasNext() ? iter.next() : folder.createFolder(name);
  });
  return folder;
}

function getSettingVal__(key, fallback) {
  try {
    var r = findOne_('Settings', 'Setting_Key', key);
    return r ? r.Setting_Value : fallback;
  } catch(e) { return fallback; }
}

// ================================================================
// SECTION 12 — ADDITIONAL REPORTS
// ================================================================

/** Counsellor-wise fee collection report */
function getCounsellorReport_(filters, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER]);

  var allFees = readAll_('Student_Fees');
  var allPay  = readAll_('Fee_Payments');
  var stuMap  = {};
  readAll_('Students').forEach(function(s){ stuMap[s.Student_ID] = s; });

  if (filters && filters.centre) {
    allFees = allFees.filter(function(f){ return f.Centre === filters.centre; });
  }

  var byCouns = {};
  allFees.forEach(function(fee) {
    var stu      = stuMap[fee.Student_ID] || {};
    var couns    = stu.Counsellor_ID || stu.Assigned_Counsellor || 'Unassigned';
    if (!byCouns[couns]) byCouns[couns] = { counsellor: couns, students: 0, total_fee: 0, collected: 0, pending: 0 };
    byCouns[couns].students   += 1;
    byCouns[couns].total_fee  += Number(fee.Net_Fee || 0);
    byCouns[couns].collected  += Number(fee.Total_Paid || 0);
    byCouns[couns].pending    += Number(fee.Pending_Amount || 0);
  });

  return Object.values(byCouns).map(function(c) {
    c.collection_pct = c.total_fee > 0 ? Math.round(c.collected / c.total_fee * 100) : 0;
    return c;
  }).sort(function(a,b){ return b.collected - a.collected; });
}

/** Student search across name, phone, email, student ID */
function searchStudents_(query, filters, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER, ROLES.TEACHER, ROLES.COUNSELLOR]);
  if (!query || query.length < 2) throw new Error('Search query must be at least 2 characters');

  var q = String(query).toLowerCase().trim();
  var students = readAll_('Students').filter(function(s){ return s.Status !== 'Deleted'; });
  var fees     = {};
  readAll_('Student_Fees').forEach(function(f){ fees[f.Student_ID] = f; });

  if (filters && filters.centre) students = students.filter(function(s){ return s.Centre === filters.centre; });
  if (filters && filters.batch)  students = students.filter(function(s){ return s.Batch  === filters.batch;  });
  if (filters && filters.course) students = students.filter(function(s){ return s.Course === filters.course; });

  return students.filter(function(s) {
    return String(s.Full_Name||'').toLowerCase().includes(q)
      || String(s.Phone||'').includes(q)
      || String(s.Email||'').toLowerCase().includes(q)
      || String(s.Student_ID||'').toLowerCase().includes(q);
  }).slice(0, 50).map(function(s) {
    var f = fees[s.Student_ID] || {};
    return {
      student_id:    s.Student_ID,
      full_name:     s.Full_Name,
      phone:         s.Phone,
      email:         s.Email,
      centre:        s.Centre,
      batch:         s.Batch,
      course:        s.Course,
      status:        s.Status,
      fee_pending:   Number(f.Pending_Amount || 0),
      fee_paid:      Number(f.Total_Paid || 0),
      payment_status:f.Payment_Status || '',
    };
  });
}

/** Batch performance — attendance % per batch/subject */
function getBatchPerformance_(filters, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER, ROLES.TEACHER]);

  var sessions = readAll_('Attendance_Sessions').filter(function(s){ return s.Status === 'Closed'; });
  var logs     = readAll_('Attendance_Log');

  if (filters && filters.centre) sessions = sessions.filter(function(s){ return s.Centre  === filters.centre;  });
  if (filters && filters.batch)  sessions = sessions.filter(function(s){ return s.Batch   === filters.batch;   });
  if (filters && filters.course) sessions = sessions.filter(function(s){ return s.Course  === filters.course;  });

  var byBatch = {};
  sessions.forEach(function(sess) {
    var key = sess.Batch + '||' + sess.Subject;
    if (!byBatch[key]) byBatch[key] = { batch: sess.Batch, course: sess.Course, subject: sess.Subject, sessions: 0, total_marks: 0, present_marks: 0 };
    var sessLogs = logs.filter(function(l){ return l.Session_ID === sess.Session_ID; });
    byBatch[key].sessions     += 1;
    byBatch[key].total_marks  += sessLogs.length;
    byBatch[key].present_marks += sessLogs.filter(function(l){ return l.Status === 'Present' || l.Status === 'Late'; }).length;
  });

  return Object.values(byBatch).map(function(b) {
    b.pct = b.total_marks > 0 ? Math.round(b.present_marks / b.total_marks * 100) : 0;
    return b;
  }).sort(function(a,b){ return b.pct - a.pct; });
}

/** Teacher ranking by attendance rate across their sessions */
function getTeacherRanking_(filters, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.REGIONAL_MANAGER, ROLES.CENTRE_MANAGER]);
  var sessions = readAll_('Attendance_Sessions').filter(function(s){ return s.Status === 'Closed'; });
  var logs     = readAll_('Attendance_Log');
  var teachMap = {};
  readAll_('Teachers').forEach(function(t){ teachMap[t.Teacher_ID] = t; });

  if (filters && filters.centre) sessions = sessions.filter(function(s){ return s.Centre === filters.centre; });

  var byTeach = {};
  sessions.forEach(function(sess) {
    var tid = sess.Teacher_ID;
    if (!tid) return;
    if (!byTeach[tid]) byTeach[tid] = { teacher_id: tid, name: (teachMap[tid] ? teachMap[tid].Full_Name : tid), sessions: 0, total: 0, present: 0 };
    var sl = logs.filter(function(l){ return l.Session_ID === sess.Session_ID; });
    byTeach[tid].sessions += 1;
    byTeach[tid].total    += sl.length;
    byTeach[tid].present  += sl.filter(function(l){ return l.Status === 'Present' || l.Status === 'Late'; }).length;
  });

  return Object.values(byTeach).map(function(t) {
    t.avg_pct = t.total > 0 ? Math.round(t.present / t.total * 100) : 0;
    return t;
  }).sort(function(a,b){ return b.avg_pct - a.avg_pct; });
}

/** Student ledger — complete financial history */
function getStudentLedger_(studentId, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER, ROLES.COUNSELLOR]);
  var student  = findOne_('Students',    'Student_ID', studentId);
  var feeRec   = findOne_('Student_Fees','Student_ID', studentId);
  var insts    = readAll_('Fee_Installments').filter(function(r){ return r.Student_ID === studentId; });
  var payments = readAll_('Fee_Payments').filter(function(r){ return r.Student_ID === studentId; });

  if (!student) throw new Error('Student not found: ' + studentId);

  return {
    student:     student,
    fee:         feeRec || {},
    installments:insts.sort(function(a,b){ return Number(a.Installment_Number) - Number(b.Installment_Number); }),
    payments:    payments.sort(function(a,b){ return new Date(a.Payment_Date||a.Timestamp).getTime() - new Date(b.Payment_Date||b.Timestamp).getTime(); }),
    summary: {
      total_fee:      Number((feeRec||{}).Net_Fee||0),
      total_paid:     Number((feeRec||{}).Total_Paid||0),
      total_pending:  Number((feeRec||{}).Pending_Amount||0),
      total_payments: payments.length,
      overdue_count:  insts.filter(function(i){ return i.Status!=='Paid' && new Date(i.Due_Date) < new Date(); }).length,
    }
  };
}

/** Assign fee plan to student — creates fee record + installments */
function assignFeePlanToStudent_(studentId, planId, overrides, actor) {
  requireRole_(actor, [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER, ROLES.COUNSELLOR]);
  return assignFeePlan_(studentId, planId, overrides || {}, actor);
}
