const db = require('../db');

const setStmt = db.prepare(`
  INSERT INTO afk (guild_id, user_id, reason, since)
  VALUES (@guildId, @userId, @reason, @since)
  ON CONFLICT (guild_id, user_id)
  DO UPDATE SET reason = @reason, since = @since
`);

const getStmt = db.prepare('SELECT reason, since FROM afk WHERE guild_id = ? AND user_id = ?');
const clearStmt = db.prepare('DELETE FROM afk WHERE guild_id = ? AND user_id = ?');

function setAfk(guildId, userId, reason, since = Date.now()) {
  setStmt.run({ guildId, userId, reason, since });
}

function getAfk(guildId, userId) {
  return getStmt.get(guildId, userId) || null;
}

function clearAfk(guildId, userId) {
  return clearStmt.run(guildId, userId).changes > 0;
}

module.exports = { setAfk, getAfk, clearAfk };
