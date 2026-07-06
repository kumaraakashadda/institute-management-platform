/**
 * SettingsFeatureFlags.gs
 * -----------------------------------------------------------------------
 * Lets Super Admin configure the platform without touching code — QR
 * expiry, GPS radius, attendance threshold, ID prefixes, and which
 * modules are turned on — per the "admin should configure everything"
 * and "support feature flags" principles.
 * -----------------------------------------------------------------------
 */

function listSettings_() { return readAll_('Settings'); }

function updateSetting_(key, value, actor) {
  requireRole_(actor, SETTINGS_WRITE_ROLES);
  return withLock_(function () {
    var row = findOne_('Settings', 'Setting_Key', key);
    if (!row) throw new Error('Unknown setting: ' + key);
    var updated = updateRow_('Settings', row._row, {
      Setting_Value: value, Updated_At: new Date().toISOString(), Updated_By: actor.sub
    });
    logAudit_(actor.sub, actor.role, 'UPDATE', 'Settings', key, row, updated);
    return updated;
  });
}

function listFeatureFlags_() { return readAll_('Feature_Flags'); }

function toggleFeatureFlag_(key, enabled, actor) {
  requireRole_(actor, SETTINGS_WRITE_ROLES);
  return withLock_(function () {
    var row = findOne_('Feature_Flags', 'Flag_Key', key);
    if (!row) throw new Error('Unknown feature flag: ' + key);
    var updated = updateRow_('Feature_Flags', row._row, {
      Enabled: enabled ? 'TRUE' : 'FALSE', Updated_At: new Date().toISOString()
    });
    logAudit_(actor.sub, actor.role, 'UPDATE', 'Feature_Flags', key, row, updated);
    return updated;
  });
}
