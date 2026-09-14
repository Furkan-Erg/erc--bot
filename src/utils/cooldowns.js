function getRemainingCooldown(lastTimestamp, cooldownMs) {
  if (!lastTimestamp) return 0;
  const elapsed = Date.now() - lastTimestamp;
  return Math.max(0, cooldownMs - elapsed);
}

function formatDuration(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

module.exports = { getRemainingCooldown, formatDuration };
