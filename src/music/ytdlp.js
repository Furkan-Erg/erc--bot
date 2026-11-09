const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('child_process');

// YouTube'dan akış çekmek için yt-dlp kullanıyoruz; ytdl-core YouTube değişikliklerine yetişemiyor.
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
// musicManager.js normalde bunu daha önce ayarlıyor ama ytdlp.js tek başına da require edilebiliyor (bkz. play.js).
const FFMPEG_PATH = process.env.FFMPEG_PATH || require('ffmpeg-static');

const MAX_PLAYLIST = 50;
const GIZLI_BASLIKLAR = new Set(['[Private video]', '[Deleted video]']);

// YouTube'un Opus (WebM) akışı varsa o seçilir: Discord'a olduğu gibi gider, ffmpeg ile çözüp yeniden
// kodlamak gerekmez (hem CPU hem de kalite kaybı sıfır). Opus yoksa en iyi sese düşülür.
const SES_FORMATI = 'bestaudio[acodec=opus]/bestaudio/best';

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

// Bilgi/liste sorguları arka plan işi: aynı anda en fazla birkaçı çalışır ve düşük öncelikli olur ki
// imza çözümü sırasında CPU'yu çalan süreçler sesi çalan ana süreci (paket zamanlaması) aksatmasın.
// İki ayrı havuz var: kullanıcının beklediği sorgular (!play, seek) ile arka plandaki otomatik oynatma
// Mix çekimi. Böylece yavaş bir Mix sorgusu bir !play'i kuyrukta bekletmez.
function sinirlayiciOlustur(sinir) {
  let calisanSayisi = 0;
  const siradakiler = [];

  return function sirayla(is) {
    return new Promise((coz, reddet) => {
      const baslat = () => {
        calisanSayisi += 1;
        is()
          .then(coz, reddet)
          .finally(() => {
            calisanSayisi -= 1;
            siradakiler.shift()?.();
          });
      };
      if (calisanSayisi < sinir) baslat();
      else siradakiler.push(baslat);
    });
  };
}

const onPlanSirasi = sinirlayiciOlustur(3);
const arkaPlanSirasi = sinirlayiciOlustur(1);

function oncelikDusur(proc) {
  try {
    if (proc.pid) os.setPriority(proc.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
  } catch {
    // Öncelik ayarlanamıyorsa (izin/platform) sorun değil, normal öncelikle devam eder.
  }
}

// `ekArgs` temel argümanlardan (çerez, JS runtime vb.) sonra eklenir. Çerez kopyası süreç gerçekten
// başlayınca oluşturulur (sırada bekleyen iş geçici dosya tutmaz) ve süreç bitince silinir.
function ytdlpCalistir(ekArgs, secenekler, { playlist = false, sirayla = onPlanSirasi } = {}) {
  return sirayla(
    () =>
      new Promise((coz, reddet) => {
        const { args, temizle } = baseArgs({ playlist });
        const proc = execFile(YTDLP_PATH, [...args, ...ekArgs], secenekler, (err, stdout, stderr) => {
          temizle();
          if (err) return reddet(new Error(stderr?.trim() || err.message));
          coz(stdout);
        });
        oncelikDusur(proc);
      }),
  );
}

async function getInfo(url) {
  const stdout = await ytdlpCalistir(['--skip-download', '--print', '%(webpage_url)s\n%(title)s\n%(duration)s', url], {
    timeout: 30_000,
  });
  const [videoUrl, title, sureStr] = stdout.trim().split('\n');
  const sure = Number(sureStr);
  return { url: videoUrl, title, duration: Number.isFinite(sure) ? sure : null };
}

async function getPlaylist(url, limit = MAX_PLAYLIST, sirayla = onPlanSirasi) {
  const stdout = await ytdlpCalistir(
    [
      '--flat-playlist',
      '--playlist-end',
      String(limit),
      '--print',
      // Kanal adı başlıktan önce: başlık sekme içerebildiği için kalan tüm parçalar başlık sayılıyor.
      '%(id)s\t%(duration)s\t%(channel)s\t%(title)s',
      url,
    ],
    { timeout: 60_000, maxBuffer: 5 * 1024 * 1024 },
    { playlist: true, sirayla },
  );

  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, sureStr, kanal, ...titleParts] = line.split('\t');
      const sure = Number(sureStr);
      return {
        url: `https://www.youtube.com/watch?v=${id}`,
        title: titleParts.join('\t') || id,
        duration: Number.isFinite(sure) ? sure : null,
        // yt-dlp bilinmeyen alanı "NA" yazar.
        channel: kanal && kanal !== 'NA' ? kanal : '',
      };
    })
    .filter((t) => !GIZLI_BASLIKLAR.has(t.title));
}

// YouTube'un bir şarkıdan sonra otomatik geçtiği şarkılar, o şarkının "Mix" listesinden (list=RD<id>)
// geliyor. Listenin ilk elemanı şarkının kendisi.
function getMix(videoId, limit = 25) {
  return getPlaylist(`https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`, limit, arkaPlanSirasi);
}

// Kuyruktaki şarkıların linki farklı biçimlerde gelebiliyor (watch?v=, youtu.be/, shorts/).
function videoIdOf(url) {
  const eslesme = /(?:[?&]v=|youtu\.be\/|\/shorts\/)([\w-]{11})/.exec(url ?? '');
  return eslesme ? eslesme[1] : null;
}

// URL'nin yanı sıra isteğin YouTube tarafından kabul edilmesi için
// gereken http_headers'ı (User-Agent, Referer vs.) da döner; ffmpeg bu header'lar olmadan
// googlevideo adresine bağlanamıyor ve "Input/output error" ile başarısız oluyor.
//
// Her seek tıklaması için yt-dlp'yi (imza çözümü dahil, saniyelerce CPU) yeniden çalıştırmamak için
// sonuç kısa süre önbellekte tutulur; googlevideo adresleri saatlerce geçerli. Aynı anda gelen
// istekler tek süreçte birleşir.
const DOGRUDAN_TTL_MS = 10 * 60_000;
const DOGRUDAN_ONBELLEK_SINIRI = 50;
const dogrudanOnbellek = new Map();

function getDirectStreamInfo(url) {
  const kayit = dogrudanOnbellek.get(url);
  if (kayit && Date.now() - kayit.zaman < DOGRUDAN_TTL_MS) return kayit.sonuc;

  const sonuc = dogrudanBilgiCek(url);
  if (dogrudanOnbellek.size >= DOGRUDAN_ONBELLEK_SINIRI) dogrudanOnbellek.delete(dogrudanOnbellek.keys().next().value);
  dogrudanOnbellek.set(url, { zaman: Date.now(), sonuc });
  // Başarısız sonuç önbellekte kalmasın ki sonraki denemede yeniden çekilsin.
  sonuc.catch(() => {
    if (dogrudanOnbellek.get(url)?.sonuc === sonuc) dogrudanOnbellek.delete(url);
  });
  return sonuc;
}

async function dogrudanBilgiCek(url) {
  const stdout = await ytdlpCalistir(['-f', SES_FORMATI, '-j', url], {
    timeout: 30_000,
    maxBuffer: 5 * 1024 * 1024,
  });

  let info;
  try {
    info = JSON.parse(stdout.trim().split('\n').pop());
  } catch (parseErr) {
    throw new Error(`yt-dlp çıktısı ayrıştırılamadı: ${parseErr.message}`);
  }
  if (!info?.url) throw new Error('yt-dlp doğrudan akış adresi vermedi');
  return {
    url: info.url,
    headers: info.http_headers || {},
    opus: /^opus/i.test(info.acodec || ''),
    olusturuldu: Date.now(),
  };
}

// Denemede googlevideo, yt-dlp'nin yeni ürettiği adrese ilk ~1-2 saniye "403 Forbidden" döndürdü
// (0 sn sonra reddedildi, 2 sn sonra kabul etti). ffmpeg'i hemen başlatınca seek hep bu hatayla düşüyordu;
// bu yüzden adres bu kadar eskimeden ffmpeg'e verilmiyor. Önbellekteki adreslerde bekleme olmaz.
const TAZE_URL_BEKLEME_MS = 2500;

// Opus paket kopyalamada Cue aralığından (YouTube'da ~10 sn) büyük pay.
const KOPYA_SEEK_PAYI_SN = 12;

// Belirli bir saniyeden başlayan akış üretir; panelin "saniyeye git" özelliği bunu kullanıyor.
// yt-dlp'nin stdout'una yazdığı akış üzerinde ffmpeg'in -ss ile arama yapması (input seeking, stdin
// seekable olmadığı için) baştan itibaren decode edip atmak zorunda kalır; bunun yerine yt-dlp'den
// doğrudan medya adresini alıp ffmpeg'e -i olarak veriyoruz, böylece HTTP byte-range ile hızlı seek olur.
//
// Kaynak Opus ise ffmpeg sadece paketleri kopyalayıp Ogg'a sarar (`opus: true` döner, çağıran tür
// tespiti yapar): decode/encode yok, kalite kaybı yok. Değilse ham PCM (s16le) üretir.
async function createSeekStream(url, saniye, onError) {
  const { url: dogrudanUrl, headers, opus, olusturuldu } = await getDirectStreamInfo(url);

  const bekleme = TAZE_URL_BEKLEME_MS - (Date.now() - olusturuldu);
  if (bekleme > 0) await new Promise((coz) => setTimeout(coz, bekleme));

  const ffmpegArgs = [];
  if (headers['User-Agent']) ffmpegArgs.push('-user_agent', headers['User-Agent']);
  const digerHeaderlar = Object.entries(headers)
    .filter(([ad]) => ad !== 'User-Agent')
    .map(([ad, deger]) => `${ad}: ${deger}`)
    .join('\r\n');
  if (digerHeaderlar) ffmpegArgs.push('-headers', `${digerHeaderlar}\r\n`);

  // Paket kopyalamada tek başına `-ss` yetmiyor: ffmpeg WebM'in "Cues" noktasına (YouTube'da ~10 sn arayla)
  // atlayıp o noktadan başlıyor ve araya düşen paketleri atmıyor; denemede -ss 30 aslında 20. saniyeden
  // başladı (panel saati ve ±10/30 sn butonları şaşardı). Bu yüzden girişte hedeften 12 sn önceye atlanıp
  // çıkışta kalan 12 sn paket düzeyinde kırpılıyor: sonuç milisaniye doğrulukta. Çözüp kodlayan (PCM)
  // yolda ffmpeg zaten tam doğru aradığı için düz `-ss` yeterli.
  const hedefSn = Math.max(0, saniye);
  const girisSn = opus ? Math.max(0, hedefSn - KOPYA_SEEK_PAYI_SN) : hedefSn;
  const kirpSn = hedefSn - girisSn;

  ffmpegArgs.push(
    // Bağlantı anlık koparsa şarkı kesilmesin diye ffmpeg kendisi yeniden bağlansın.
    '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
    '-ss', String(girisSn),
    '-i', dogrudanUrl,
    ...(opus && kirpSn > 0 ? ['-ss', String(kirpSn)] : []),
    '-vn',
    ...(opus ? ['-c:a', 'copy', '-f', 'ogg'] : ['-f', 's16le', '-ar', '48000', '-ac', '2']),
    'pipe:1',
  );

  const proc = spawn(FFMPEG_PATH, ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderr = '';
  proc.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  proc.on('error', (err) => onError(err));
  proc.on('close', (code) => {
    if (code && code !== 0 && !proc.killed) {
      // Adres süresi dolmuş ya da reddedilmiş olabilir; bir sonraki seek yeni adres alsın.
      dogrudanOnbellek.delete(url);
      onError(new Error(stderr.trim().split('\n').pop() || `ffmpeg ${code} koduyla çıktı`));
    }
  });
  proc.stdout.on('error', () => {});

  return { stream: proc.stdout, kill: () => proc.kill('SIGKILL'), opus };
}

function createStream(url, onError) {
  const { args, temizle } = baseArgs();
  const proc = spawn(YTDLP_PATH, [...args, '-f', SES_FORMATI, '-o', '-', url], {
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
