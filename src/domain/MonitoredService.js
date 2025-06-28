class MonitoredService {
  constructor(serviceId, status = "HEALTHY", currentLevel = null) {
    this.serviceId = serviceId;
    this.status = status;
    this.currentLevel = currentLevel;
  }

  isHealthy() {
    return this.status === "HEALTHY";
  }

  isUnhealthy() {
    return this.status === "UNHEALTHY";
  }

  setUnhealthy(level) {
    this.status = "UNHEALTHY";
    this.currentLevel = level;
  }

  setAcknowledged() {
    this.status = "ACKNOWLEDGED";
  }

  setHealthy() {
    this.status = "HEALTHY";
    this.currentLevel = null;
  }
}

module.exports = MonitoredService;
