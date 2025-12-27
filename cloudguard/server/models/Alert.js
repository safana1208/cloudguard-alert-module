class Alert {
  constructor({ id, severity, category, status, description }) {
    this.id = id;
    this.severity = severity;
    this.category = category;
    this.status = status;
    this.description = description;
  }
}

module.exports = Alert;
