const { spawn, execFile } = require('child_process');

// YouTube'dan akış çekmek için yt-dlp kullanıyoruz; ytdl-core YouTube değişikliklerine yetişemiyor.
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
// musicManager.js normalde bunu daha önce ayarlıyor ama ytdlp.js tek başına da require edilebiliyor (bkz. play.js).
const FFMPEG_PATH = process.env.FFMPEG_PATH || require('ffmpeg-static');

const MAX_PLAYLIST = 50;
const GIZLI_BASLIKLAR = new Set(['[Private video]', '[Deleted video]']);

function baseArgs({ playlist = false } = {}) {
  // YouTube imza çözümü için JS runtime gerekiyor; imajda zaten node var
  const args = [playlist ? '--yes-playlist' : '--no-playlist', '--no-warnings', '--quiet', '--js-runtimes', 'node'];
  if (process.env.YTDLP_COOKIES) args.push('--cookies', process.env.YTDLP_COOKIES);
  return args;
}

function getInfo(url) {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_PATH,
      [...baseArgs(), '--skip-download', '--print', '%(webpage_url)s\n%(title)s\n%(duration)s', url],
      { timeout: 30_000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr?.trim() || err.message));
        const [videoUrl, title, sureStr] = stdout.trim().split('\n');
        const sure = Number(sureStr);
        resolve({ url: videoUrl, title, duration: Number.isFinite(sure) ? sure : null });
      },
    );
  });
}

function getPlaylist(url) {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_PATH,
      [
        ...baseArgs({ playlist: true }),
        '--flat-playlist',
        '--playlist-end',
        String(MAX_PLAYLIST),
        '--print',
        '%(id)s\t%(duration)s\t%(title)s',
        url,
      ],
      { timeout: 60_000, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout, stderr) => {
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

function getDirectStreamUrl(url) {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_PATH,
      [...baseArgs(), '-f', 'bestaudio/best', '--get-url', url],
      { timeout: 30_000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr?.trim() || err.message));
        const dogrudanUrl = stdout.trim().split('\n').pop();
        if (!dogrudanUrl) return reject(new Error('yt-dlp doğrudan akış adresi vermedi'));
        resolve(dogrudanUrl);
      },
    );
  });
}

// Belirli bir saniyeden başlayan ham PCM akışı üretir; panelin "saniyeye git" özelliği bunu kullanıyor.
// yt-dlp'nin stdout'una yazdığı akış üzerinde ffmpeg'in -ss ile arama yapması (input seeking, stdin
// seekable olmadığı için) baştan itibaren decode edip atmak zorunda kalır; bunun yerine yt-dlp'den
// doğrudan medya adresini alıp ffmpeg'e -i olarak veriyoruz, böylece HTTP byte-range ile hızlı seek olur.
async function createSeekStream(url, saniye, onError) {
  const dogrudanUrl = await getDirectStreamUrl(url);

  const proc = spawn(
    FFMPEG_PATH,
    ['-ss', String(Math.max(0, saniye)), '-i', dogrudanUrl, '-vn', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

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
  const proc = spawn(YTDLP_PATH, [...baseArgs(), '-f', 'bestaudio/best', '-o', '-', url], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  proc.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  proc.on('error', (err) => onError(err));
  proc.on('close', (code) => {
    if (code && code !== 0 && !proc.killed) {
      onError(new Error(stderr.trim().split('\n').pop() || `yt-dlp ${code} koduyla çıktı`));
    }
  });
  // ffmpeg akışı erken kapatırsa EPIPE fırlamasın
  proc.stdout.on('error', () => {});

  return { stream: proc.stdout, kill: () => proc.kill('SIGKILL') };
}

module.exports = { getInfo, getPlaylist, createStream, createSeekStream, MAX_PLAYLIST };
