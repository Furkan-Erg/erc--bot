const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'bot.sqlite'));
db.pragma('journal_mode = WAL');

const migrationSql = fs.readFileSync(
  path.join(__dirname, 'migrations', '001_init.sql'),
  'utf8'
);
db.exec(migrationSql);

module.exports = db;
