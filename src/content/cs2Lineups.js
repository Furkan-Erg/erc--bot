// Lineup aramasının saf verisi: harita/tip takma adları, güvenilir kanallar ve sorgu şablonları.
// Ağ işleri src/utils/cs2LineupSearch.js içinde.

// Lineup klibi yayınlayan haritalar. Anahtarlar cs2Maps.js'deki key alanıyla aynı.
const HARITALAR = {
  de_nuke: { aranan: 'Nuke', desen: /\bnuke\b/, takmaAdlar: ['nuke', 'nük', 'nuk'] },
  de_mirage: { aranan: 'Mirage', desen: /\bmirage\b/, takmaAdlar: ['mirage', 'miraj'] },
  de_dust2: { aranan: 'Dust 2', desen: /dust ?2|dust ii/, takmaAdlar: ['dust2', 'dust', 'd2', 'dust 2'] },
  de_inferno: { aranan: 'Inferno', desen: /\binferno\b/, takmaAdlar: ['inferno', 'inf'] },
  de_ancient: { aranan: 'Ancient', desen: /\bancient\b/, takmaAdlar: ['ancient'] },
  de_overpass: { aranan: 'Overpass', desen: /\boverpass\b/, takmaAdlar: ['overpass', 'op'] },
  de_train: { aranan: 'Train', desen: /\btrain\b/, takmaAdlar: ['train', 'tren'] },
  de_anubis: { aranan: 'Anubis', desen: /\banubis\b/, takmaAdlar: ['anubis'] },
  de_vertigo: { aranan: 'Vertigo', desen: /\bvertigo\b/, takmaAdlar: ['vertigo'] },
};

const TIPLER = {
  smoke: {
    ad: 'Smoke',
    emoji: '💨',
    aranan: 'smoke',
    kelimeler: ['smoke'],
    takmaAdlar: ['smoke', 'smokes', 'sis', 'duman'],
  },
  flash: {
    ad: 'Flash',
    emoji: '⚡',
    aranan: 'flash',
    kelimeler: ['flash', 'flashbang'],
    takmaAdlar: ['flash', 'flashes', 'flaş', 'flas', 'flashbang'],
  },
  molotov: {
    ad: 'Molotov',
    emoji: '🔥',
    aranan: 'molotov',
    kelimeler: ['molotov', 'molly', 'incendiary', 'fire'],
    takmaAdlar: ['molotov', 'molly', 'mol', 'yangın', 'yangin', 'ates', 'ateş', 'incendiary'],
  },
  he: {
    ad: 'HE',
    emoji: '💣',
    aranan: 'HE grenade',
    kelimeler: ['he ', 'he-', 'grenade', 'nade', 'damage'],
    takmaAdlar: ['he', 'nade', 'grenade', 'patlayıcı', 'patlayici', 'bomba'],
  },
};

// Lineup başına tek kısa klip atan kanallar: hem sorguyu yönlendiriyor hem sıralamada öne geçiyor.
const KANALLAR = ['NadesOutHere', 'CS2_Rampn', 'Gold Cs Nades'];

function haritaCoz(girdi) {
  const aranan = String(girdi || '')
    .toLocaleLowerCase('en')
    .trim();
  if (!aranan) return null;
  const bulunan = Object.entries(HARITALAR).find(([key, harita]) => key === aranan || harita.takmaAdlar.includes(aranan));
  return bulunan ? bulunan[0] : null;
}

function tipCoz(girdi) {
  const aranan = String(girdi || '')
    .toLocaleLowerCase('en')
    .trim();
  if (!aranan) return null;
  const bulunan = Object.entries(TIPLER).find(([key, tip]) => key === aranan || tip.takmaAdlar.includes(aranan));
  return bulunan ? bulunan[0] : null;
}

// Kanal adıyla yapılan aramalar en temiz sonucu veriyor; genel sorgular zayıf
// kombinasyonlarda (örn. dust2 flash) boşluğu dolduruyor.
function sorgular(haritaKey, tipKey) {
  const harita = HARITALAR[haritaKey];
  const tip = TIPLER[tipKey];
  return [
    `${KANALLAR[0]} CS2 ${harita.aranan} ${tip.aranan}`,
    `${KANALLAR[1]} CS2 ${harita.aranan} ${tip.aranan}`,
    `CS2 ${harita.aranan} ${tip.aranan} lineup tutorial`,
    `CS2 ${harita.aranan} ${tip.aranan} lineup #shorts`,
  ];
}

const HARITA_ADLARI = Object.values(HARITALAR).map((h) => h.aranan);
const TIP_ADLARI = Object.values(TIPLER).map((t) => t.ad);

module.exports = { HARITALAR, TIPLER, KANALLAR, HARITA_ADLARI, TIP_ADLARI, haritaCoz, tipCoz, sorgular };
