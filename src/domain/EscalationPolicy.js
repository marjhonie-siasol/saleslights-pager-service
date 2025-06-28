class EscalationPolicy {
  constructor(serviceId, levels) {
    this.serviceId = serviceId;
    this.levels = levels.sort((a, b) => a.levelNumber - b.levelNumber);
  }

  getLevel(levelNumber) {
    return this.levels.find((l) => l.levelNumber === levelNumber);
  }
}

module.exports = EscalationPolicy;
