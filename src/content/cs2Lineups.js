// Lineup aramasının saf verisi: harita/tip/taraf takma adları, güvenilir kanallar ve
// sorgu şablonları. Ağ işleri src/utils/cs2LineupSearch.js içinde.

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
  de_cache: { aranan: 'Cache', desen: /\bcache\b/, takmaAdlar: ['cache', 'keş', 'kes'] },
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

// Taraflar ayrı tutuluyor çünkü hem sorguya ("... CT smoke") hem de başlık süzmesine
// giriyorlar. Desenler dar: "ct" kelime sınırıyla aranıyor, T tarafı ise yalnızca
// "T side / T spawn / terrorist" kalıplarında sayılıyor — tek harflik "t" her yere uyar.
const TARAFLAR = {
  ct: {
    ad: 'CT',
    aranan: 'CT',
    desen: /\bct\b|counter[\s-]?terror/i,
    takmaAdlar: ['ct', 'ctside', 'ct-side', 'ct side', 'counter', 'polis', 'savunma', 'defans'],
  },
  t: {
    ad: 'T',
    aranan: 'T',
    // Tek harflik "t" başlıklarda sık geçiyor ("T Red Smoke", "(T-Side)"), o yüzden
    // kelime sınırıyla kabul ediliyor; kesme işaretinden sonrası ("don't") eleniyor.
    desen: /(?<!['’])\bt\b|\bt[\s-]?(?:side|spawn)\b|\bterrorist\b/i,
    takmaAdlar: ['t', 'tside', 't-side', 't side', 'terorist', 'terörist', 'atak', 'saldiri', 'saldırı'],
  },
};

// Lineup başına tek kısa klip atan kanallar: hem sorguyu yönlendiriyor hem sıralamada öne geçiyor.
const KANALLAR = ['NadesOutHere', 'CS2_Rampn', 'Gold Cs Nades'];

// Türkçe locale "I" harfini "ı" yapıyor; "Inferno" gibi girdiler takma adlara uymasın
// diye küçültme 'en' locale'i ile yapılıyor (Türkçe karakterli takma adlar etkilenmiyor).
function kucult(girdi) {
  return String(girdi || '')
    .toLocaleLowerCase('en')
    .trim();
}

function kacir(metin) {
  return metin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function haritaCoz(girdi) {
  const aranan = kucult(girdi);
  if (!aranan) return null;
  const bulunan = Object.entries(HARITALAR).find(([key, harita]) => key === aranan || harita.takmaAdlar.includes(aranan));
  return bulunan ? bulunan[0] : null;
}

function tipCoz(girdi) {
  const aranan = kucult(girdi);
  if (!aranan) return null;
  const bulunan = Object.entries(TIPLER).find(([key, tip]) => key === aranan || tip.takmaAdlar.includes(aranan));
  return bulunan ? bulunan[0] : null;
}

function tarafCoz(girdi) {
  const aranan = kucult(girdi);
  if (!aranan) return null;
  const bulunan = Object.entries(TARAFLAR).find(([key, taraf]) => key === aranan || taraf.takmaAdlar.includes(aranan));
  return bulunan ? bulunan[0] : null;
}

/**
 * Üçüncü argümanı çözer: "ct"/"t" tarafa, geri kalan her şey ("window", "a site",
 * "mid") serbest mevki metnine dönüşür. Her ikisi de aynı alanlara sahip olduğu için
 * arama tarafı ikisini ayırt etmek zorunda kalmıyor.
 */
function filtreCoz(girdi) {
  const ham = String(girdi || '').trim().replace(/\s+/g, ' ');
  if (!ham) return null;

  const tarafKey = tarafCoz(ham);
  if (tarafKey) {
    const taraf = TARAFLAR[tarafKey];
    return { tur: 'taraf', anahtar: tarafKey, ad: taraf.ad, aranan: taraf.aranan, desen: taraf.desen };
  }

  const temiz = kucult(ham);
  return { tur: 'mevki', anahtar: temiz, ad: ham, aranan: ham, desen: new RegExp(kacir(temiz), 'i') };
}

// Kanal adıyla yapılan aramalar en temiz sonucu veriyor; genel sorgular zayıf
// kombinasyonlarda (örn. dust2 flash) boşluğu dolduruyor. Taraf/mevki verildiğinde
// terim sorgunun içine gömülüyor: genel sonuçları sonradan süzmek neredeyse hiç klip
// bırakmıyor, "NadesOutHere CS2 Ancient CT smoke" ise doğrudan o tarafı getiriyor.
function sorgular(haritaKey, tipKey, filtre = null) {
  const harita = HARITALAR[haritaKey];
  const tip = TIPLER[tipKey];

  if (!filtre) {
    return [
      `${KANALLAR[0]} CS2 ${harita.aranan} ${tip.aranan}`,
      `${KANALLAR[1]} CS2 ${harita.aranan} ${tip.aranan}`,
      `CS2 ${harita.aranan} ${tip.aranan} lineup tutorial`,
      `CS2 ${harita.aranan} ${tip.aranan} lineup #shorts`,
    ];
  }

  const liste = [
    `${KANALLAR[0]} CS2 ${harita.aranan} ${filtre.aranan} ${tip.aranan}`,
    `${KANALLAR[1]} CS2 ${harita.aranan} ${filtre.aranan} ${tip.aranan}`,
    `CS2 ${harita.aranan} ${tip.aranan} ${filtre.aranan}`,
  ];
  liste.push(
    filtre.tur === 'taraf'
      ? `CS2 ${harita.aranan} ${tip.aranan} from ${filtre.aranan} spawn`
      : `CS2 ${harita.aranan} ${filtre.aranan} ${tip.aranan} lineup`
  );
  return liste;
}

const HARITA_ADLARI = Object.values(HARITALAR).map((h) => h.aranan);
const TIP_ADLARI = Object.values(TIPLER).map((t) => t.ad);
const TARAF_ADLARI = Object.values(TARAFLAR).map((t) => t.ad);

module.exports = {
  HARITALAR,
  TIPLER,
  TARAFLAR,
  KANALLAR,
  HARITA_ADLARI,
  TIP_ADLARI,
  TARAF_ADLARI,
  haritaCoz,
  tipCoz,
  tarafCoz,
  filtreCoz,
  sorgular,
};
