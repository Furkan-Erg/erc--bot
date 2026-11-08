const { spawn, execFile } = require('child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// YouTube'dan akış çekmek için yt-dlp kullanıyoruz; ytdl-core YouTube değişikliklerine yetişemiyor.
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
// musicManager.js normalde bunu daha önce ayarlıyor ama ytdlp.js tek başına da require edilebiliyor (bkz. play.js).
const FFMPEG_PATH = process.env.FFMPEG_PATH || require('ffmpeg-static');

const MAX_PLAYLIST = 50;
const GIZLI_BASLIKLAR = new Set(['[Private video]', '[Deleted video]']);

// Sunucu veri merkezi IP'sinden çıktığı için YouTube zaman zaman "Sign in to confirm you're not a bot" diyor;
// çözümü oturum açmış bir tarayıcıdan dışa aktarılmış çerez dosyası. Dosya `YTDLP_COOKIES` ile ya da varsayılan
// yere (`secrets/youtube-cookies.txt`, compose'da salt okunur bağlı) konur; yenisi bırakılınca sonraki istek onu kullanır.
// yt-dlp çıkarken çerez dosyasını yeniden yazar ve aynı anda birden çok süreç çalışabilir (akış, şarkı bilgisi,
// otomatik oynatma ön yüklemesi): her süreç kendi yazılabilir kopyasını alır, süreç bitince kopya silinir.
const COOKIES_SRC = process.env.YTDLP_COOKIES || path.join(__dirname, '..', '..', 'secrets', 'youtube-cookies.txt');
let kopyaSayaci = 0;

function cerezVar() {
  try {
    return fs.statSync(COOKIES_SRC).isFile();
  } catch {
    return false;
  }
}

// Dönen `temizle` süreç bittiğinde (başarılı ya da hatalı) çağrılır.
function baseArgs({ playlist = false } = {}) {
  // YouTube imza çözümü için JS runtime gerekiyor; imajda zaten node var
  const args = [playlist ? '--yes-playlist' : '--no-playlist', '--no-warnings', '--quiet', '--js-runtimes', 'node'];
  let temizle = () => {};
  if (cerezVar()) {
    const kopya = path.join(os.tmpdir(), `ercu-bot-cookies-${process.pid}-${++kopyaSayaci}.txt`);
    try {
      fs.copyFileSync(COOKIES_SRC, kopya);
      args.push('--cookies', kopya);
      temizle = () => fs.rm(kopya, { force: true }, () => {});
    } catch {
      args.push('--cookies', COOKIES_SRC); // kopya yazılamadıysa kaynağın kendisi (yt-dlp geri yazamazsa yalnız uyarır)
    }
  }
  return { args, temizle };
}

// Kanala yazılacak kısa hata: yt-dlp'nin çok satırlı, bağlantılı stderr'i yerine ne olduğunu söyleyen tek cümle.
// Ayrıntı yine log'a gider (logger.error tam hatayı yazar).
function kisaHata(err) {
  const mesaj = String(err?.message ?? err ?? '');
  if (/Sign in to confirm you.?re not a bot/i.test(mesaj)) {
    return cerezVar()
      ? "YouTube bot doğrulaması istedi; sunucudaki çerez dosyasının süresi dolmuş olabilir, yenisi gerekiyor"
      : "YouTube bot doğrulaması istedi; sunucuda çerez dosyası yok (secrets/youtube-cookies.txt)";
  }
  if (/Video unavailable|Private video|has been removed/i.test(mesaj)) return 'video kaldırılmış ya da gizli';
  if (/age.?restricted|confirm your age/i.test(mesaj)) return 'yaş sınırlı video (çerez dosyası gerekiyor)';
  // İlk cümle, sondaki noktasız (çağıran kendi noktasını koyar).
  return mesaj.replace(/^ERROR:\s*(\[[^\]]+\]\s*[\w-]+:\s*)?/, '').split(/(?<=\.)\s|\n/)[0].slice(0, 150).replace(/\.+$/, '');
}

function getInfo(url) {
  return new Promise((resolve, reject) => {
    const { args, temizle } = baseArgs();
    execFile(
      YTDLP_PATH,
      [...args, '--skip-download', '--print', '%(webpage_url)s\n%(title)s\n%(duration)s', url],
      { timeout: 30_000 },
      (err, stdout, stderr) => {
        temizle();
        if (err) return reject(new Error(stderr?.trim() || err.message));
        const [videoUrl, title, sureStr] = stdout.trim().split('\n');
        const sure = Number(sureStr);
        resolve({ url: videoUrl, title, duration: Number.isFinite(sure) ? sure : null });
      },
    );
  });
}

function getPlaylist(url, limit = MAX_PLAYLIST) {
  return new Promise((resolve, reject) => {
    const { args, temizle } = baseArgs({ playlist: true });
    execFile(
      YTDLP_PATH,
      [
        ...args,
        '--flat-playlist',
        '--playlist-end',
        String(limit),
        '--print',
        '%(id)s\t%(duration)s\t%(title)s',
        url,
      ],
      { timeout: 60_000, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout, stderr) => {
        temizle();
        if (err) return reject(new Error(stderr?.trim() || err.message));
        const tracks = stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [id, sureStr, ...titleParts] = line.split('\t');
            const sure = Number(sureStr);
            return {
              url: `https://www.youtube.com/watch?v=${id}`,
              title: titleParts.join('\t') || id,
              duration: Number.isFinite(sure) ? sure : null,
            };
          })
          .filter((t) => !GIZLI_BASLIKLAR.has(t.title));
        resolve(tracks);
      },
    );
  });
}

// YouTube'un bir şarkıdan sonra otomatik geçtiği şarkılar, o şarkının "Mix" listesinden (list=RD<id>)
// geliyor. Listenin ilk elemanı şarkının kendisi.
function getMix(videoId, limit = 25) {
  return getPlaylist(`https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`, limit);
}

// Kuyruktaki şarkıların linki farklı biçimlerde gelebiliyor (watch?v=, youtu.be/, shorts/).
function videoIdOf(url) {
  const eslesme = /(?:[?&]v=|youtu\.be\/|\/shorts\/)([\w-]{11})/.exec(url ?? '');
  return eslesme ? eslesme[1] : null;
}

// URL'nin yanı sıra isteğin YouTube tarafından kabul edilmesi için
// gereken http_headers'ı (User-Agent, Referer vs.) da döner; ffmpeg bu header'lar olmadan
// googlevideo adresine bağlanamıyor ve "Input/output error" ile başarısız oluyor.
function getDirectStreamInfo(url) {
  return new Promise((resolve, reject) => {
    const { args, temizle } = baseArgs();
    execFile(
      YTDLP_PATH,
      [...args, '-f', 'bestaudio/best', '-j', url],
      { timeout: 30_000, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout, stderr) => {
        temizle();
        if (err) return reject(new Error(stderr?.trim() || err.message));
        let info;
        try {
          info = JSON.parse(stdout.trim().split('\n').pop());
        } catch (parseErr) {
          return reject(new Error(`yt-dlp çıktısı ayrıştırılamadı: ${parseErr.message}`));
        }
        if (!info?.url) return reject(new Error('yt-dlp doğrudan akış adresi vermedi'));
        resolve({ url: info.url, headers: info.http_headers || {} });
      },
    );
  });
}

// Belirli bir saniyeden başlayan ham PCM akışı üretir; panelin "saniyeye git" özelliği bunu kullanıyor.
// yt-dlp'nin stdout'una yazdığı akış üzerinde ffmpeg'in -ss ile arama yapması (input seeking, stdin
// seekable olmadığı için) baştan itibaren decode edip atmak zorunda kalır; bunun yerine yt-dlp'den
// doğrudan medya adresini alıp ffmpeg'e -i olarak veriyoruz, böylece HTTP byte-range ile hızlı seek olur.
async function createSeekStream(url, saniye, onError) {
  const { url: dogrudanUrl, headers } = await getDirectStreamInfo(url);

  const ffmpegArgs = [];
  if (headers['User-Agent']) ffmpegArgs.push('-user_agent', headers['User-Agent']);
  const digerHeaderlar = Object.entries(headers)
    .filter(([ad]) => ad !== 'User-Agent')
    .map(([ad, deger]) => `${ad}: ${deger}`)
    .join('\r\n');
  if (digerHeaderlar) ffmpegArgs.push('-headers', `${digerHeaderlar}\r\n`);
  ffmpegArgs.push(
    '-ss', String(Math.max(0, saniye)),
    '-i', dogrudanUrl,
    '-vn', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1',
  );

  const proc = spawn(FFMPEG_PATH, ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderr = '';
  proc.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  proc.on('error', (err) => onError(err));
  proc.on('close', (code) => {
    if (code && code !== 0 && !proc.killed) {
      onError(new Error(stderr.trim().split('\n').pop() || `ffmpeg ${code} koduyla çıktı`));
    }
  });
  proc.stdout.on('error', () => {});

  return { stream: proc.stdout, kill: () => proc.kill('SIGKILL') };
}

function createStream(url, onError) {
  const { args, temizle } = baseArgs();
  const proc = spawn(YTDLP_PATH, [...args, '-f', 'bestaudio/best', '-o', '-', url], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  proc.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  proc.on('error', (err) => {
    temizle();
    onError(err);
  });
  proc.on('close', (code) => {
    temizle();
    if (code && code !== 0 && !proc.killed) {
      onError(new Error(stderr.trim().split('\n').pop() || `yt-dlp ${code} koduyla çıktı`));
    }
  });
  // ffmpeg akışı erken kapatırsa EPIPE fırlamasın
  proc.stdout.on('error', () => {});

  return { stream: proc.stdout, kill: () => proc.kill('SIGKILL') };
}

module.exports = { getInfo, getPlaylist, getMix, videoIdOf, createStream, createSeekStream, kisaHata, MAX_PLAYLIST };
