const db = require('../db');

const setStmt = db.prepare(`
  INSERT INTO cooldowns (guild_id, user_id, key, last_at)
  VALUES (@guildId, @userId, @key, @lastAt)
  ON CONFLICT (guild_id, user_id, key)
  DO UPDATE SET last_at = @lastAt
`);

const getStmt = db.prepare('SELECT last_at FROM cooldowns WHERE guild_id = ? AND user_id = ? AND key = ?');

function getLastUse(guildId, userId, key) {
  return getStmt.get(guildId, userId, key)?.last_at ?? null;
}

function markUsed(guildId, userId, key, lastAt = Date.now()) {
  setStmt.run({ guildId, userId, key, lastAt });
}

module.exports = { getLastUse, markUsed };
