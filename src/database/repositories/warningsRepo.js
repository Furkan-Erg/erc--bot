const db = require('../db');

const insertWarning = db.prepare(`
  INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at)
  VALUES (@guildId, @userId, @moderatorId, @reason, @createdAt)
`);

const selectWarnings = db.prepare(`
  SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC
`);

const deleteWarnings = db.prepare(`
  DELETE FROM warnings WHERE guild_id = ? AND user_id = ?
`);

function addWarning(guildId, userId, moderatorId, reason) {
  insertWarning.run({ guildId, userId, moderatorId, reason, createdAt: Date.now() });
}

function getWarnings(guildId, userId) {
  return selectWarnings.all(guildId, userId);
}

function clearWarnings(guildId, userId) {
  deleteWarnings.run(guildId, userId);
}

module.exports = { addWarning, getWarnings, clearWarnings };
