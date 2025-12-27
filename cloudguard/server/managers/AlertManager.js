class AlertManager {
  constructor(alertRepository, auditLogManager) {
    this.alertRepository = alertRepository;
    this.auditLogManager = auditLogManager;
  }
}

module.exports = AlertManager;
