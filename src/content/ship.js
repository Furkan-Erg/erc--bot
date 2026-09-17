// Yüzdeye göre sıralı yorum aralıkları (esik: bu değerin altındaki yüzdeler için geçerli)
const YORUMLAR = [
  { esik: 10, metin: 'Bu iş olmaz. Olmaz derken gerçekten olmaz.' },
  { esik: 25, metin: 'Arkadaş kalın, hatta biraz uzaktan arkadaş kalın.' },
  { esik: 40, metin: 'Zorlarsanız olur ama neden zorlayasınız ki?' },
  { esik: 55, metin: 'İdare eder. Aile toplantılarında konuşacak konu bulunur.' },
  { esik: 70, metin: 'Fena değil, bu işte bir şeyler var.' },
  { esik: 85, metin: 'Bu ciddi bir muhabbet, mahalle çoktan konuşuyor.' },
  { esik: 96, metin: 'Düğün salonuna bakın derim, gerisi teferruat.' },
  { esik: 101, metin: 'Efsane. Bu eşleşmeyi görenler ağladı.' },
];

function yorumBul(yuzde) {
  return YORUMLAR.find((y) => yuzde < y.esik)?.metin ?? YORUMLAR[YORUMLAR.length - 1].metin;
}

module.exports = { YORUMLAR, yorumBul };
