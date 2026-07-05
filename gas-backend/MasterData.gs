/**
 * MasterData.gs
 * -----------------------------------------------------------------------
 * Generic, reusable CRUD for every "reference data" table: Centres,
 * Courses, Batches, Subjects, Target_Years, Segments. One implementation
 * serves all six tables, per the "every API should be reusable" principle
 * — adding a 7th reference table later means one line in Config.gs, not
 * a new set of functions here.
 *
 * Reading requires any valid login. Writing requires MASTER_DATA_WRITE_ROLES.
 * -----------------------------------------------------------------------
 */

var MASTER_ID_COLUMN = {
  Centres: 'Centre_ID', Courses: 'Course_ID', Batches: 'Batch_ID',
  Subjects: 'Subject_ID', Target_Years: 'Target_Year_ID', Segments: 'Segment_ID'
};
var MASTER_ID_PREFIX = {
  Centres: 'CTR', Courses: 'CRS', Batches: 'BAT',
  Subjects: 'SUB', Target_Years: 'TY', Segments: 'SEG'
};

function assertMasterTable_(table) {
  if (MASTER_DATA_TABLES.indexOf(table) === -1) {
    throw new Error('"' + table + '" is not a recognised master data table.');
  }
}

function listMasterData_(table) {
  assertMasterTable_(table);
  return readAll_(table).filter(function (r) { return r.Status !== 'Deleted'; });
}

function createMasterData_(table, fields, actor) {
  assertMasterTable_(table);
  requireRole_(actor, MASTER_DATA_WRITE_ROLES);
  return withLock_(function () {
    var idCol = MASTER_ID_COLUMN[table];
    var id = nextId_(table, MASTER_ID_PREFIX[table], idCol);
    var record = Object.assign({}, fields);
    record[idCol] = id;
    if (!record.Status) record.Status = 'Active';
    appendRow_(table, record);
    logAudit_(actor.sub, actor.role, 'CREATE', table, id, null, record);
    return record;
  });
}

function updateMasterData_(table, id, patch, actor) {
  assertMasterTable_(table);
  requireRole_(actor, MASTER_DATA_WRITE_ROLES);
  return withLock_(function () {
    var idCol = MASTER_ID_COLUMN[table];
    var existing = findOne_(table, idCol, id);
    if (!existing) throw new Error(table + ' record ' + id + ' not found.');
    var updated = updateRow_(table, existing._row, patch);
    logAudit_(actor.sub, actor.role, 'UPDATE', table, id, existing, updated);
    return updated;
  });
}

function deleteMasterData_(table, id, actor) {
  assertMasterTable_(table);
  requireRole_(actor, MASTER_DATA_WRITE_ROLES);
  return withLock_(function () {
    var idCol = MASTER_ID_COLUMN[table];
    var existing = findOne_(table, idCol, id);
    if (!existing) throw new Error(table + ' record ' + id + ' not found.');
    softDeleteRow_(table, existing._row);
    logAudit_(actor.sub, actor.role, 'DELETE', table, id, existing, null);
    return true;
  });
}
