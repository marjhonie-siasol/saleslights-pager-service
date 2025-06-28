const PagerService = require("../src/domain/PagerService");
const MonitoredService = require("../src/domain/MonitoredService");
const EscalationPolicy = require("../src/domain/EscalationPolicy");
const Level = require("../src/domain/Level");
const Target = require("../src/domain/Target");

const mockPersistencePort = {
  getServiceState: jest.fn(),
  saveServiceState: jest.fn(),
};
const mockEscalationPolicyPort = {
  getPolicyByServiceId: jest.fn(),
};
const mockNotificationPort = {
  sendNotification: jest.fn(),
};
const mockTimerPort = {
  setAcknowledgementTimeout: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

const serviceId = "service-123";
const alertMessage = "Database is down!";
const emailTarget = new Target("EMAIL", "dev@example.com");
const smsTarget = new Target("SMS", "+15551234567");
const level1 = new Level(1, [emailTarget]);
const level2 = new Level(2, [smsTarget]);
const samplePolicy = new EscalationPolicy(serviceId, [level1, level2]);

describe("PagerService Use Cases", () => {
  const pagerService = new PagerService(
    mockPersistencePort,
    mockEscalationPolicyPort,
    mockNotificationPort,
    mockTimerPort
  );

  test("Given a Healthy Service, when an Alert is received, it notifies level 1 and sets a timer", async () => {
    const healthyService = new MonitoredService(serviceId, "HEALTHY");
    mockPersistencePort.getServiceState.mockResolvedValue(healthyService);
    mockEscalationPolicyPort.getPolicyByServiceId.mockResolvedValue(
      samplePolicy
    );

    await pagerService.handleIncomingAlert({
      serviceId,
      message: alertMessage,
    });

    expect(mockNotificationPort.sendNotification).toHaveBeenCalledTimes(1);
    expect(mockNotificationPort.sendNotification).toHaveBeenCalledWith(
      emailTarget,
      alertMessage
    );
    expect(mockTimerPort.setAcknowledgementTimeout).toHaveBeenCalledWith(
      serviceId,
      15
    );
    expect(mockPersistencePort.saveServiceState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "UNHEALTHY",
        currentLevel: 1,
      })
    );
  });

  test("Given an Unhealthy Service, when a Timeout occurs, it notifies the next level and sets a new timer", async () => {
    const unhealthyService = new MonitoredService(serviceId, "UNHEALTHY", 1);
    mockPersistencePort.getServiceState.mockResolvedValue(unhealthyService);
    mockEscalationPolicyPort.getPolicyByServiceId.mockResolvedValue(
      samplePolicy
    );

    await pagerService.handleAcknowledgementTimeout({ serviceId });

    expect(mockNotificationPort.sendNotification).toHaveBeenCalledTimes(1);
    expect(mockNotificationPort.sendNotification).toHaveBeenCalledWith(
      smsTarget,
      expect.any(String)
    );
    expect(mockTimerPort.setAcknowledgementTimeout).toHaveBeenCalledWith(
      serviceId,
      15
    );
    expect(mockPersistencePort.saveServiceState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "UNHEALTHY",
        currentLevel: 2,
      })
    );
  });

  test("Given an Unhealthy Service, when an Acknowledgement is received, it updates the state and does not notify or set a timer", async () => {
    const unhealthyService = new MonitoredService(serviceId, "UNHEALTHY", 1);
    mockPersistencePort.getServiceState.mockResolvedValue(unhealthyService);

    await pagerService.handleAcknowledgement({ serviceId });

    expect(mockNotificationPort.sendNotification).not.toHaveBeenCalled();
    expect(mockTimerPort.setAcknowledgementTimeout).not.toHaveBeenCalled();
    expect(mockPersistencePort.saveServiceState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ACKNOWLEDGED",
      })
    );
  });

  test("Given an Unhealthy Service, when a Healthy event is received, it updates the state and does not notify or set a timer", async () => {
    const unhealthyService = new MonitoredService(serviceId, "UNHEALTHY", 1);
    mockPersistencePort.getServiceState.mockResolvedValue(unhealthyService);

    await pagerService.handleHealthyEvent({ serviceId });

    expect(mockNotificationPort.sendNotification).not.toHaveBeenCalled();
    expect(mockTimerPort.setAcknowledgementTimeout).not.toHaveBeenCalled();
    expect(mockPersistencePort.saveServiceState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "HEALTHY",
        currentLevel: null,
      })
    );
  });

  test("Given an Unhealthy Service, when another Alert is received, it does nothing", async () => {
    const unhealthyService = new MonitoredService(serviceId, "UNHEALTHY", 1);
    mockPersistencePort.getServiceState.mockResolvedValue(unhealthyService);

    await pagerService.handleIncomingAlert({
      serviceId,
      message: "Another alert!",
    });

    expect(
      mockEscalationPolicyPort.getPolicyByServiceId
    ).not.toHaveBeenCalled();
    expect(mockNotificationPort.sendNotification).not.toHaveBeenCalled();
    expect(mockTimerPort.setAcknowledgementTimeout).not.toHaveBeenCalled();
    expect(mockPersistencePort.saveServiceState).not.toHaveBeenCalled();
  });
});
