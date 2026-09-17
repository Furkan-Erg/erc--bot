const { spawn, execFile } = require('child_process');

// YouTube'dan akış çekmek için yt-dlp kullanıyoruz; ytdl-core YouTube değişikliklerine yetişemiyor.
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';

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
      [...baseArgs(), '--skip-download', '--print', '%(webpage_url)s\n%(title)s', url],
      { timeout: 30_000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr?.trim() || err.message));
        const [videoUrl, title] = stdout.trim().split('\n');
        resolve({ url: videoUrl, title });
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
        '%(id)s\t%(title)s',
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
            const [id, ...titleParts] = line.split('\t');
            return { url: `https://www.youtube.com/watch?v=${id}`, title: titleParts.join('\t') || id };
          })
          .filter((t) => !GIZLI_BASLIKLAR.has(t.title));
        resolve(tracks);
      },
    );
  });
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

module.exports = { getInfo, getPlaylist, createStream, MAX_PLAYLIST };
