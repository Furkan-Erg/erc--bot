const { YEDEK_HAVUZ } = require('../content/steamOyunlar');
const logger = require('./logger');

// SteamSpy'ın "all" ucu en çok sahiplenilen 1000 oyunu veriyor; Steam'in kendi
// GetAppList'i 200 binden fazla kayıt döndürdüğü ve çoğu DLC/demo olduğu için
// rastgele seçim orada işe yaramıyor.
const HAVUZ_URL = 'https://steamspy.com/api.php?request=all&page=0';
const detayUrl = (appid) => `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=TR&l=turkish`;

const HAVUZ_TTL_MS = 12 * 60 * 60 * 1000;
const DETAY_TTL_MS = 60 * 60 * 1000;
const ZAMAN_ASIMI_MS = 8000;
const EN_FAZLA_DENEME = 6;
const DETAY_ONBELLEK_SINIRI = 300;

let havuzKaydi = null;
const detayOnbellek = new Map();

async function jsonAl(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ZAMAN_ASIMI_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function rastgele(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

/**
 * Oyun havuzunu getirir ve 12 saat bellekte tutar. SteamSpy'a ulaşılamazsa
 * content/steamOyunlar.js'deki yedek listeye düşer; o listede istatistik alanları
 * olmadığı için filtreler yalnızca canlı detay üzerinden uygulanır.
 */
async function havuzGetir() {
  if (havuzKaydi && Date.now() - havuzKaydi.zaman < HAVUZ_TTL_MS) return havuzKaydi;

  try {
    const veri = await jsonAl(HAVUZ_URL);
    const oyunlar = Object.values(veri).filter((o) => o?.appid && o?.name);
    if (oyunlar.length === 0) throw new Error('boş havuz');
    havuzKaydi = { zaman: Date.now(), oyunlar, canli: true };
  } catch (err) {
    logger.warn(`Steam havuzu SteamSpy'dan alınamadı, yedek listeye düşülüyor (${err.message})`);
    havuzKaydi = {
      zaman: Date.now(),
      oyunlar: YEDEK_HAVUZ.map((o) => ({ appid: o.appid, name: o.ad })),
      canli: false,
    };
  }

  return havuzKaydi;
}

async function detayGetir(appid) {
  const kayit = detayOnbellek.get(appid);
  if (kayit && Date.now() - kayit.zaman < DETAY_TTL_MS) return kayit.detay;

  try {
    const veri = await jsonAl(detayUrl(appid));
    const detay = veri?.[appid]?.success ? veri[appid].data : null;
    // Önbellek şişmesin: en eski kayıttan başlayarak atılıyor.
    if (detayOnbellek.size >= DETAY_ONBELLEK_SINIRI) detayOnbellek.delete(detayOnbellek.keys().next().value);
    detayOnbellek.set(appid, { zaman: Date.now(), detay });
    return detay;
  } catch (err) {
    logger.warn(`Steam oyun detayı alınamadı: ${appid} (${err.message})`);
    return null;
  }
}

function puanYuzdesi(havuzKaydiOyun) {
  const olumlu = Number(havuzKaydiOyun?.positive);
  const olumsuz = Number(havuzKaydiOyun?.negative);
  if (!Number.isFinite(olumlu) || !Number.isFinite(olumsuz) || olumlu + olumsuz === 0) return null;
  return { yuzde: Math.round((olumlu / (olumlu + olumsuz)) * 100), oy: olumlu + olumsuz };
}

function derle(detay, havuzOyunu) {
  const fiyat = detay.price_overview || null;
  return {
    appid: detay.steam_appid,
    ad: detay.name,
    aciklama: detay.short_description || '',
    gorsel: detay.header_image || null,
    url: `https://store.steampowered.com/app/${detay.steam_appid}/`,
    ucretsiz: Boolean(detay.is_free) || fiyat?.final === 0,
    fiyat: fiyat ? { simdi: fiyat.final_formatted, once: fiyat.initial_formatted, indirim: fiyat.discount_percent } : null,
    turler: (detay.genres || []).map((t) => t.description),
    cikis: detay.release_date?.coming_soon ? 'Yakında' : detay.release_date?.date || null,
    gelistirici: (detay.developers || [])[0] || null,
    puan: puanYuzdesi(havuzOyunu),
    ccu: Number(havuzOyunu?.ccu) || null,
  };
}

/**
 * Havuzdan rastgele bir oyun seçip Steam'den canlı detayını getirir. Seçilen kayıt
 * oyun değilse (DLC, yazılım) ya da detay gelmezse birkaç kez yeniden deniyor.
 * Filtre verildiyse hem havuz önceden eleniyor hem de canlı detay doğrulanıyor.
 */
async function rastgeleOyun(filtre = null) {
  const havuz = await havuzGetir();

  // Yedek listede fiyat/indirim alanı yok; ön eleme yalnızca canlı havuzda yapılabiliyor.
  const adaylar = filtre && havuz.canli ? havuz.oyunlar.filter((o) => filtre.havuzdaUyar(o)) : havuz.oyunlar;
  if (adaylar.length === 0) return null;

  const denenenler = new Set();
  for (let deneme = 0; deneme < EN_FAZLA_DENEME; deneme++) {
    const aday = rastgele(adaylar);
    if (denenenler.has(aday.appid)) continue;
    denenenler.add(aday.appid);

    const detay = await detayGetir(aday.appid);
    if (!detay || detay.type !== 'game') continue;
    if (filtre && !filtre.detaydaUyar(detay)) continue;

    return derle(detay, aday);
  }

  return null;
}

module.exports = { rastgeleOyun, havuzGetir };
