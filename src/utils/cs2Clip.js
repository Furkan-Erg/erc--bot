const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const ffmpegPath = require('ffmpeg-static');
const logger = require('./logger');

// Müzik tarafıyla aynı yt-dlp kurulumu kullanılıyor (bkz. src/music/ytdlp.js).
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const ONBELLEK_DIZINI = path.join(__dirname, '..', '..', 'data', 'cs2-clips');

const INDIRME_ZAMAN_ASIMI_MS = 90_000;
const KODLAMA_ZAMAN_ASIMI_MS = 120_000;
const EN_UZUN_SANIYE = 90;
// Discord'un ücretsiz sunucularda izin verdiği sınır 10 MB; altında kalmak için 8 MB hedefliyoruz.
const HEDEF_BOYUT = 8 * 1024 * 1024;
const ENFAZLA_DOSYA = 60;
const ENFAZLA_TOPLAM_BOYUT = 500 * 1024 * 1024;

// Aynı klibi aynı anda isteyenler tek indirmeyi paylaşsın.
const suregelenler = new Map();

function dizinHazirla() {
  if (!fs.existsSync(ONBELLEK_DIZINI)) fs.mkdirSync(ONBELLEK_DIZINI, { recursive: true });
}

function calistir(komut, args, zamanAsimi) {
  return new Promise((resolve, reject) => {
    execFile(komut, args, { timeout: zamanAsimi, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.toString().trim() || err.message));
      resolve(stdout);
    });
  });
}

function ytdlpArgs(videoId, hedef) {
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--quiet',
    '--js-runtimes',
    'node',
    '-f',
    'b[height<=720][ext=mp4]/bv*[height<=720][ext=mp4]+ba[ext=m4a]/b',
    '--download-sections',
    `*0-${EN_UZUN_SANIYE}`,
    '--merge-output-format',
    'mp4',
    '-o',
    hedef,
  ];
  // İmajda sistem ffmpeg'i yok; yt-dlp kesme/birleştirme için ffmpeg-static'i kullansın.
  if (ffmpegPath) args.push('--ffmpeg-location', ffmpegPath);
  if (process.env.YTDLP_COOKIES) args.push('--cookies', process.env.YTDLP_COOKIES);
  args.push(`https://www.youtube.com/watch?v=${videoId}`);
  return args;
}

async function boyut(dosya) {
  const stat = await fsp.stat(dosya);
  return stat.size;
}

// Discord sınırını aşan klipleri 480p'ye düşürüp yeniden kodlar.
async function kucult(kaynak) {
  const gecici = `${kaynak}.min.mp4`;
  await calistir(
    ffmpegPath,
    [
      '-y',
      '-i',
      kaynak,
      '-vf',
      'scale=-2:480',
      '-c:v',
      'libx264',
      '-crf',
      '32',
      '-preset',
      'veryfast',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-movflags',
      '+faststart',
      gecici,
    ],
    KODLAMA_ZAMAN_ASIMI_MS
  );
  await fsp.rename(gecici, kaynak);
  return boyut(kaynak);
}

// Önbellek şişmesin: en eskiden başlayarak siler.
async function temizle() {
  const dosyalar = await fsp.readdir(ONBELLEK_DIZINI).catch(() => []);
  const kayitlar = [];
  for (const dosya of dosyalar) {
    const tamYol = path.join(ONBELLEK_DIZINI, dosya);
    const stat = await fsp.stat(tamYol).catch(() => null);
    if (stat?.isFile()) kayitlar.push({ tamYol, mtime: stat.mtimeMs, boyut: stat.size });
  }

  kayitlar.sort((a, b) => b.mtime - a.mtime);
  let toplam = 0;
  for (let i = 0; i < kayitlar.length; i++) {
    toplam += kayitlar[i].boyut;
    if (i < ENFAZLA_DOSYA && toplam <= ENFAZLA_TOPLAM_BOYUT) continue;
    await fsp.unlink(kayitlar[i].tamYol).catch(() => {});
  }
}

async function indir(videoId, hedef) {
  dizinHazirla();
  await fsp.unlink(hedef).catch(() => {});
  await calistir(YTDLP_PATH, ytdlpArgs(videoId, hedef), INDIRME_ZAMAN_ASIMI_MS);

  let dosyaBoyutu = await boyut(hedef);
  if (dosyaBoyutu > HEDEF_BOYUT) {
    logger.info(`CS2 klibi büyük geldi (${Math.round(dosyaBoyutu / 1048576)} MB), küçültülüyor: ${videoId}`);
    dosyaBoyutu = await kucult(hedef);
  }

  if (dosyaBoyutu > HEDEF_BOYUT) {
    await fsp.unlink(hedef).catch(() => {});
    throw new Error(`Klip küçültmeye rağmen ${Math.round(dosyaBoyutu / 1048576)} MB kaldı.`);
  }

  await temizle();
  return hedef;
}

/**
 * Klibi indirip data/cs2-clips altında saklar ve dosya yolunu döner.
 * İndirilemezse null döner; komut o zaman YouTube linkine düşer.
 */
async function klipIndir(videoId) {
  const hedef = path.join(ONBELLEK_DIZINI, `${videoId}.mp4`);

  if (fs.existsSync(hedef)) {
    // LRU temizliği mtime'a bakıyor, izlenen klip taze sayılsın.
    const simdi = new Date();
    await fsp.utimes(hedef, simdi, simdi).catch(() => {});
    return hedef;
  }

  if (suregelenler.has(videoId)) return suregelenler.get(videoId);

  const is = indir(videoId, hedef)
    .catch((err) => {
      logger.error(`CS2 klibi indirilemedi: ${videoId} (${err.message})`);
      return null;
    })
    .finally(() => suregelenler.delete(videoId));

  suregelenler.set(videoId, is);
  return is;
}

module.exports = { klipIndir };
