// Aynı kanalda mesajla tahmin alan iki oyun aynı anda çalışırsa tahminler karışır.
const kilitliKanallar = new Set();

function tryLock(channelId) {
  if (kilitliKanallar.has(channelId)) return false;
  kilitliKanallar.add(channelId);
  return true;
}

function unlock(channelId) {
  kilitliKanallar.delete(channelId);
}

module.exports = { tryLock, unlock };
