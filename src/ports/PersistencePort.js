class PersistencePort {
  async getServiceState(serviceId) {
    throw new Error("Not implemented");
  }

  async saveServiceState(service) {
    throw new Error("Not implemented");
  }
}

module.exports = PersistencePort;
