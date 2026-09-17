const { getRemainingCooldown } = require('./cooldowns');

function createCooldownTracker(cooldownMs) {
  const lastUsed = new Map();

  return {
    getRemaining(key) {
      return getRemainingCooldown(lastUsed.get(key), cooldownMs);
    },
    markUsed(key) {
      lastUsed.set(key, Date.now());
    },
  };
}

module.exports = { createCooldownTracker };
