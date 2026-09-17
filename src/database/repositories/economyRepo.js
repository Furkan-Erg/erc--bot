const db = require('../db');

const getOrCreateUser = db.prepare(`
  INSERT INTO users (guild_id, user_id, balance)
  VALUES (@guildId, @userId, 0)
  ON CONFLICT (guild_id, user_id) DO NOTHING
`);

const selectUser = db.prepare(`
  SELECT * FROM users WHERE guild_id = ? AND user_id = ?
`);

const addBalanceStmt = db.prepare(`
  UPDATE users SET balance = balance + @amount
  WHERE guild_id = @guildId AND user_id = @userId
`);

const setLastDailyStmt = db.prepare(`
  UPDATE users SET last_daily = @timestamp
  WHERE guild_id = @guildId AND user_id = @userId
`);

const setLastWorkStmt = db.prepare(`
  UPDATE users SET last_work = @timestamp
  WHERE guild_id = @guildId AND user_id = @userId
`);

const topBalancesStmt = db.prepare(`
  SELECT user_id, balance FROM users
  WHERE guild_id = ? AND balance > 0
  ORDER BY balance DESC
  LIMIT ?
`);

function ensureUser(guildId, userId) {
  getOrCreateUser.run({ guildId, userId });
  return selectUser.get(guildId, userId);
}

function getBalance(guildId, userId) {
  const user = ensureUser(guildId, userId);
  return user.balance;
}

function addBalance(guildId, userId, amount) {
  ensureUser(guildId, userId);
  addBalanceStmt.run({ guildId, userId, amount });
  return getBalance(guildId, userId);
}

function getLastDaily(guildId, userId) {
  const user = ensureUser(guildId, userId);
  return user.last_daily;
}

function setLastDaily(guildId, userId, timestamp) {
  ensureUser(guildId, userId);
  setLastDailyStmt.run({ guildId, userId, timestamp });
}

function getLastWork(guildId, userId) {
  const user = ensureUser(guildId, userId);
  return user.last_work;
}

function setLastWork(guildId, userId, timestamp) {
  ensureUser(guildId, userId);
  setLastWorkStmt.run({ guildId, userId, timestamp });
}

function getTopBalances(guildId, limit = 10) {
  return topBalancesStmt.all(guildId, limit);
}

const transferTx = db.transaction((guildId, fromId, toId, amount) => {
  ensureUser(guildId, fromId);
  ensureUser(guildId, toId);
  addBalanceStmt.run({ guildId, userId: fromId, amount: -amount });
  addBalanceStmt.run({ guildId, userId: toId, amount });
});

function transfer(guildId, fromId, toId, amount) {
  transferTx(guildId, fromId, toId, amount);
}

module.exports = {
  ensureUser,
  getBalance,
  addBalance,
  getLastDaily,
  setLastDaily,
  getLastWork,
  setLastWork,
  getTopBalances,
  transfer,
};
