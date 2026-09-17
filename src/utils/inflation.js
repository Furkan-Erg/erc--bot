const db = require('../database/db');
const metaRepo = require('../database/repositories/metaRepo');
const inventoryRepo = require('../database/repositories/inventoryRepo');

const INTERVAL_MS = 6 * 60 * 60 * 1000;
const THRESHOLD = 1000;
const MIN_RATE = 0.02;
const MAX_RATE = 0.06;
const KASA_CARPANI = 0.5;

// Sadece eşiğin üstündeki kısım erir; kasası olanlar yarı oranda etkilenir.
const applyStmt = db.prepare(`
  UPDATE users
  SET balance = balance - CAST(
    (balance - @threshold) * @rate *
    (CASE WHEN EXISTS (
      SELECT 1 FROM inventory i
      WHERE i.guild_id = users.guild_id AND i.user_id = users.user_id
        AND i.item_id = 'kasa' AND i.quantity > 0
    ) THEN @kasaCarpani ELSE 1 END)
  AS INTEGER)
  WHERE balance > @threshold
`);

function lastRunAt() {
  return Number(metaRepo.get('inflation_last_run') || 0);
}

function lastRate() {
  return Number(metaRepo.get('inflation_last_rate') || 0);
}

function nextRunAt() {
  return lastRunAt() + INTERVAL_MS;
}

function applyInflation() {
  const rate = MIN_RATE + Math.random() * (MAX_RATE - MIN_RATE);
  const { changes } = applyStmt.run({ threshold: THRESHOLD, rate, kasaCarpani: KASA_CARPANI });
  metaRepo.set('inflation_last_run', Date.now());
  metaRepo.set('inflation_last_rate', rate);
  return { rate, affected: changes };
}

function runIfDue() {
  if (!lastRunAt()) {
    // İlk kurulumda hemen bakiye eritmemek için sayacı başlat.
    metaRepo.set('inflation_last_run', Date.now());
    return null;
  }
  if (Date.now() < nextRunAt()) return null;
  return applyInflation();
}

function estimateMaxLoss(guildId, userId, balance) {
  if (balance <= THRESHOLD) return 0;
  const carpan = inventoryRepo.getQuantity(guildId, userId, 'kasa') > 0 ? KASA_CARPANI : 1;
  return Math.floor((balance - THRESHOLD) * MAX_RATE * carpan);
}

module.exports = {
  INTERVAL_MS,
  THRESHOLD,
  MIN_RATE,
  MAX_RATE,
  lastRate,
  nextRunAt,
  runIfDue,
  estimateMaxLoss,
};
