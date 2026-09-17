const db = require('../db');

const setStmt = db.prepare(`
  INSERT INTO meta (key, value) VALUES (@key, @value)
  ON CONFLICT (key) DO UPDATE SET value = @value
`);

const getStmt = db.prepare('SELECT value FROM meta WHERE key = ?');

function get(key) {
  return getStmt.get(key)?.value ?? null;
}

function set(key, value) {
  setStmt.run({ key, value: String(value) });
}

module.exports = { get, set };
