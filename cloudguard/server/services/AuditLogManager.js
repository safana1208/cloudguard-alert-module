class AuditLogManager {
  log(action, data) {
    console.log(`[AUDIT] ${action}`, data);
  }
}

module.exports = AuditLogManager;
