const MonitoredService = require("./MonitoredService");

class PagerService {
  constructor(
    persistencePort,
    escalationPolicyPort,
    notificationPort,
    timerPort
  ) {
    this.persistencePort = persistencePort;
    this.escalationPolicyPort = escalationPolicyPort;
    this.notificationPort = notificationPort;
    this.timerPort = timerPort;
  }

  async handleIncomingAlert(alert) {
    let service = await this.persistencePort.getServiceState(alert.serviceId);

    if (!service) {
      service = new MonitoredService(alert.serviceId);
    }

    if (!service.isHealthy()) {
      console.log(
        `Alert for service ${alert.serviceId} is already active. Ignoring.`
      );
      return;
    }

    const policy = await this.escalationPolicyPort.getPolicyByServiceId(
      alert.serviceId
    );
    const firstLevel = policy.getLevel(1);

    if (!firstLevel) {
      console.error(
        `No escalation levels found for service ${alert.serviceId}`
      );
      return;
    }

    service.setUnhealthy(1);

    for (const target of firstLevel.targets) {
      await this.notificationPort.sendNotification(target, alert.message);
    }

    await this.timerPort.setAcknowledgementTimeout(alert.serviceId, 15);
    await this.persistencePort.saveServiceState(service);
  }

  async handleAcknowledgementTimeout(timeoutEvent) {
    const service = await this.persistencePort.getServiceState(
      timeoutEvent.serviceId
    );

    if (!service || !service.isUnhealthy()) {
      return;
    }

    const policy = await this.escalationPolicyPort.getPolicyByServiceId(
      timeoutEvent.serviceId
    );
    const nextLevelNumber = service.currentLevel + 1;
    const nextLevel = policy.getLevel(nextLevelNumber);

    if (!nextLevel) {
      console.log(
        `Max escalation level reached for service ${timeoutEvent.serviceId}.`
      );
      return;
    }

    service.setUnhealthy(nextLevelNumber);

    for (const target of nextLevel.targets) {
      await this.notificationPort.sendNotification(
        target,
        `Alert for ${timeoutEvent.serviceId} has not been acknowledged and is escalating.`
      );
    }

    await this.timerPort.setAcknowledgementTimeout(timeoutEvent.serviceId, 15);
    await this.persistencePort.saveServiceState(service);
  }

  async handleAcknowledgement(ackEvent) {
    const service = await this.persistencePort.getServiceState(
      ackEvent.serviceId
    );

    if (!service || !service.isUnhealthy()) {
      return;
    }

    service.setAcknowledged();
    await this.persistencePort.saveServiceState(service);
  }

  async handleHealthyEvent(healthyEvent) {
    const service = await this.persistencePort.getServiceState(
      healthyEvent.serviceId
    );

    if (!service || service.isHealthy()) {
      return;
    }

    service.setHealthy();
    await this.persistencePort.saveServiceState(service);
  }
}

module.exports = PagerService;
