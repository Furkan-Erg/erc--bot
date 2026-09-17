const db = require('../db');

const insertRow = db.prepare(`
  INSERT INTO levels (guild_id, user_id, xp) VALUES (@guildId, @userId, 0)
  ON CONFLICT (guild_id, user_id) DO NOTHING
`);

const selectRow = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?');

const addXpStmt = db.prepare(`
  UPDATE levels SET xp = xp + @amount, last_xp_at = @timestamp
  WHERE guild_id = @guildId AND user_id = @userId
`);

const topStmt = db.prepare(`
  SELECT user_id, xp FROM levels
  WHERE guild_id = ? AND xp > 0
  ORDER BY xp DESC
  LIMIT ?
`);

const rankStmt = db.prepare(`
  SELECT COUNT(*) AS higher FROM levels
  WHERE guild_id = ? AND xp > ?
`);

function ensureRow(guildId, userId) {
  insertRow.run({ guildId, userId });
  return selectRow.get(guildId, userId);
}

function getXp(guildId, userId) {
  return ensureRow(guildId, userId).xp;
}

function getLastXpAt(guildId, userId) {
  return ensureRow(guildId, userId).last_xp_at;
}

function addXp(guildId, userId, amount, timestamp = Date.now()) {
  ensureRow(guildId, userId);
  addXpStmt.run({ guildId, userId, amount, timestamp });
  return getXp(guildId, userId);
}

function getTop(guildId, limit = 10) {
  return topStmt.all(guildId, limit);
}

function getRank(guildId, userId) {
  const xp = getXp(guildId, userId);
  return rankStmt.get(guildId, xp).higher + 1;
}

module.exports = { getXp, getLastXpAt, addXp, getTop, getRank };
