function xpForNextLevel(level) {
  return 100 + level * 50;
}

function levelInfo(totalXp) {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  return { level, current: remaining, needed: xpForNextLevel(level) };
}

module.exports = { xpForNextLevel, levelInfo };
