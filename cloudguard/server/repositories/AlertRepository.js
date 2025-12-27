class AlertRepository {
  async save(alert) { return alert; }
  async findByID(id) { return null; }
  async findAll(filter) { return []; }
  async updateStatus(id, status) { return null; }
}

module.exports = AlertRepository;
