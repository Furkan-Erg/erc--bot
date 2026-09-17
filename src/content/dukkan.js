const URUNLER = [
  {
    id: 'simit',
    ad: 'Simit',
    emoji: '🥯',
    fiyat: 30,
    aciklama: 'Açlığını bastırır. İstatistiği yoktur ama moral verir.',
  },
  {
    id: 'cay',
    ad: 'Çay Bardağı',
    emoji: '🍵',
    fiyat: 50,
    aciklama: 'Koleksiyonluk. Çay çaydır, tartışma yok.',
  },
  {
    id: 'nazar',
    ad: 'Nazar Boncuğu',
    emoji: '🧿',
    fiyat: 500,
    aciklama: 'Sana yapılan bir soygun girişimini boşa çıkarır (tek kullanımlık).',
  },
  {
    id: 'kravat',
    ad: 'Esnaf Kravatı',
    emoji: '👔',
    fiyat: 2000,
    aciklama: 'Envanterinde durur, sana saygı duyulur (duyulmaz).',
  },
  {
    id: 'kasa',
    ad: 'Çelik Kasa',
    emoji: '🔐',
    fiyat: 5000,
    aciklama: 'Enflasyonun bakiyene verdiği zararı yarıya indirir (kalıcı).',
  },
];

function urunBul(id) {
  return URUNLER.find((u) => u.id === id.toLowerCase()) || null;
}

module.exports = { URUNLER, urunBul };
