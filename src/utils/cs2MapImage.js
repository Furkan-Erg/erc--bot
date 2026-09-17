const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createCanvas, loadImage } = require('canvas');
const logger = require('./logger');

// İndirilen görseller küçültülüp burada saklanıyor; data/ Docker'da kalıcı volume.
const ONBELLEK_DIZINI = path.join(__dirname, '..', '..', 'data', 'cs2-maps');
const ONBELLEK_G = 480;
const ONBELLEK_Y = 270;
const INDIRME_ZAMAN_ASIMI_MS = 10_000;

const SUTUN = 3;
const HUCRE_G = 320;
const HUCRE_Y = 180;
const ETIKET_Y = 36;
const BOSLUK = 14;
const KENAR = 18;

const ARKA_PLAN = '#1b1d23';
const SECILI_RENK = '#57f287';
const PASIF_RENK = '#3a3f4b';
const YAZI_TIPI = '"DejaVu Sans", "Noto Sans", Arial, sans-serif';

// Aynı süreçte tekrar tekrar diskten okumamak için yüklenen görseller bellekte tutuluyor.
const bellektekiler = new Map();

function dizinHazirla() {
  if (!fs.existsSync(ONBELLEK_DIZINI)) {
    fs.mkdirSync(ONBELLEK_DIZINI, { recursive: true });
  }
}

// Görseli hücreye sığdırırken en-boy oranını bozmadan ortadan kırpar.
function kirparakCiz(ctx, image, x, y, genislik, yukseklik) {
  const olcek = Math.max(genislik / image.width, yukseklik / image.height);
  const g = image.width * olcek;
  const y2 = image.height * olcek;
  ctx.drawImage(image, x + (genislik - g) / 2, y + (yukseklik - y2) / 2, g, y2);
}

async function onbellekOlustur(harita) {
  const hedef = path.join(ONBELLEK_DIZINI, `${harita.key}.png`);
  const res = await fetch(harita.gorsel, { signal: AbortSignal.timeout(INDIRME_ZAMAN_ASIMI_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const image = await loadImage(buffer);
  const canvas = createCanvas(ONBELLEK_G, ONBELLEK_Y);
  kirparakCiz(canvas.getContext('2d'), image, 0, 0, ONBELLEK_G, ONBELLEK_Y);

  dizinHazirla();
  await fsp.writeFile(hedef, canvas.toBuffer('image/png'));
  return hedef;
}

// Görsel indirilemezse null döner; ızgara o hücreyi düz renkle çizer.
async function haritaGorseli(harita) {
  if (bellektekiler.has(harita.key)) return bellektekiler.get(harita.key);

  const onbellek = path.join(ONBELLEK_DIZINI, `${harita.key}.png`);
  try {
    const yol = fs.existsSync(onbellek) ? onbellek : await onbellekOlustur(harita);
    const image = await loadImage(yol);
    bellektekiler.set(harita.key, image);
    return image;
  } catch (err) {
    logger.warn(`CS2 harita görseli alınamadı: ${harita.key} (${err.message})`);
    bellektekiler.set(harita.key, null);
    return null;
  }
}

function yedekZeminCiz(ctx, x, y) {
  const gradyan = ctx.createLinearGradient(x, y, x + HUCRE_G, y + HUCRE_Y);
  gradyan.addColorStop(0, '#2c3340');
  gradyan.addColorStop(1, '#171a20');
  ctx.fillStyle = gradyan;
  ctx.fillRect(x, y, HUCRE_G, HUCRE_Y);
}

function onayIsaretiCiz(ctx, x, y) {
  const r = 16;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = SECILI_RENK;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - 7, y);
  ctx.lineTo(x - 2, y + 6);
  ctx.lineTo(x + 8, y - 6);
  ctx.strokeStyle = '#13151a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/**
 * Harita ızgarasını PNG buffer olarak üretir. Seçili haritalar renkli ve
 * çerçeveli, seçili olmayanlar karartılmış çizilir.
 */
async function haritaIzgarasi(haritalar, seciliKeyler = []) {
  const secili = new Set(seciliKeyler);
  const satir = Math.ceil(haritalar.length / SUTUN);
  const genislik = KENAR * 2 + SUTUN * HUCRE_G + (SUTUN - 1) * BOSLUK;
  const yukseklik = KENAR * 2 + satir * (HUCRE_Y + ETIKET_Y) + (satir - 1) * BOSLUK;

  const canvas = createCanvas(genislik, yukseklik);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ARKA_PLAN;
  ctx.fillRect(0, 0, genislik, yukseklik);

  const gorseller = await Promise.all(haritalar.map((h) => haritaGorseli(h)));

  for (let i = 0; i < haritalar.length; i++) {
    const harita = haritalar[i];
    const sutun = i % SUTUN;
    const satirNo = Math.floor(i / SUTUN);
    const x = KENAR + sutun * (HUCRE_G + BOSLUK);
    const y = KENAR + satirNo * (HUCRE_Y + ETIKET_Y + BOSLUK);
    const isaretli = secili.has(harita.key);

    const gorsel = gorseller[i];
    if (gorsel) kirparakCiz(ctx, gorsel, x, y, HUCRE_G, HUCRE_Y);
    else yedekZeminCiz(ctx, x, y);

    if (!isaretli) {
      ctx.fillStyle = 'rgba(10, 11, 14, 0.62)';
      ctx.fillRect(x, y, HUCRE_G, HUCRE_Y);
    }

    // Etiket şeridi
    ctx.fillStyle = isaretli ? SECILI_RENK : '#262a33';
    ctx.fillRect(x, y + HUCRE_Y, HUCRE_G, ETIKET_Y);

    ctx.fillStyle = isaretli ? '#13151a' : '#9aa1ad';
    ctx.font = `bold 20px ${YAZI_TIPI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}. ${harita.ad}`, x + 12, y + HUCRE_Y + ETIKET_Y / 2, HUCRE_G - 24);

    ctx.strokeStyle = isaretli ? SECILI_RENK : PASIF_RENK;
    ctx.lineWidth = isaretli ? 4 : 2;
    ctx.strokeRect(x + 1, y + 1, HUCRE_G - 2, HUCRE_Y + ETIKET_Y - 2);

    if (isaretli) onayIsaretiCiz(ctx, x + HUCRE_G - 26, y + 26);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { haritaIzgarasi };
