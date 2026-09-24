process.env.FFMPEG_PATH = process.env.FFMPEG_PATH || require('ffmpeg-static');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const { PermissionFlagsBits } = require('discord.js');
const ytdlp = require('./ytdlp');
const panel = require('./panel');
const logger = require('../utils/logger');

const LOOP_MODLARI = ['kapali', 'sarki', 'kuyruk'];
const BOS_KANAL_BEKLEME_MS = 30_000;
const SIRA_BITTI_BEKLEME_MS = 15_000;

const guildStates = new Map();

function getState(guildId) {
  return guildStates.get(guildId);
}

// @discordjs/voice içindeki ağ aşamaları (NetworkingStatusCode dışa aktarılmadığı için elle eşleniyor).
const AG_ASAMALARI = ['ws-aciliyor', 'kimlik-dogrulama', 'udp-el-sikisma', 'protokol-secimi', 'hazir', 'yeniden-baglaniyor', 'kapali'];

// Bağlantı takılınca hangi adımda kaldığını ve hangi ses sunucusuna gidildiğini gösterir.
function agAsamasi(connection) {
  const networking = connection.state?.networking;
  const durum = networking?.state;
  if (!durum) return 'ağ katmanı hiç başlamadı (ses sunucusu bilgisi gelmedi)';
  const asama = AG_ASAMALARI[durum.code] ?? durum.code;
  return `ağ aşaması: ${asama}, ses sunucusu: ${durum.connectionOptions?.endpoint ?? 'bilinmiyor'}`;
}

// Panel mesajı hep en altta dursun diye şarkı değişince eskisi silinip yenisi gönderiliyor.
async function sendPanel(state) {
  const eski = state.panelMessage;
  state.panelMessage = null;
  if (eski) await eski.delete().catch(() => {});
  if (!state.current) return;

  try {
    state.panelMessage = await state.textChannel.send(panel.build(state));
  } catch (err) {
    logger.error('Müzik paneli gönderilemedi', err);
  }
}

// Duraklatma, döngü, karıştırma gibi durum değişiklikleri panelde yerinde güncelleniyor.
async function refreshPanel(guildId) {
  const state = getState(guildId);
  if (!state?.panelMessage || !state.current) return;
  await state.panelMessage.edit(panel.build(state)).catch(() => {});
}

function removePanel(state) {
  const mesaj = state.panelMessage;
  state.panelMessage = null;
  if (mesaj) mesaj.delete().catch(() => {});
}

function destroyState(guildId) {
  const state = guildStates.get(guildId);
  if (!state) return;
  guildStates.delete(guildId);
  clearTimeout(state.leaveTimer);
  clearTimeout(state.queueBittiTimer);
  removePanel(state);
  try {
    state.killStream?.();
    state.player.stop(true);
    state.connection.destroy();
  } catch {
    // bağlantı zaten kapanmış olabilir, önemli değil
  }
}

function requeueFinished(state) {
  const bitti = state.current;
  if (!bitti || bitti.failed) return;

  if (state.loop === 'sarki' && !state.skipRequested) {
    state.queue.unshift(bitti);
  } else if (state.loop === 'kuyruk') {
    state.queue.push(bitti);
  }
}

// Bazı ağlardan Discord'un otomatik seçtiği ses sunucusuna (özellikle c-otp*.discord.media) UDP
// paketleri geçmiyor; bağlantı "udp-el-sikisma" aşamasında ölüyor. Elle bölge seçilince farklı bir
// ses sunucusuna düşüldüğü için sorun kalkıyor. Bot da aynı şeyi kendisi yapabilsin diye
// başarısız bağlantıdan sonra kanalın bölgesi sırayla bu adaylara çevrilip tekrar deneniyor.
const YEDEK_BOLGELER = (process.env.VOICE_REGIONS || 'rotterdam,frankfurt,milan,madrid')
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);

const BAGLANTI_BEKLEME_MS = 20_000;

async function bolgeDegistirVeYenidenBagla(state, guildId) {
  const kanal = state.voiceChannel;
  if (!kanal) return false;

  const bolge = YEDEK_BOLGELER.find((b) => !state.denenenBolgeler.includes(b));
  if (!bolge) return false;

  const izinler = kanal.permissionsFor(kanal.guild.members.me);
  if (!izinler?.has(PermissionFlagsBits.ManageChannels)) {
    logger.warn(`Ses bölgesi değiştirilemedi: "Kanalları Yönet" izni yok (#${kanal.name}, ${kanal.guild.name})`);
    return false;
  }

  state.denenenBolgeler.push(bolge);
  logger.info(`Ses bölgesi "${bolge}" olarak deneniyor (#${kanal.name}, ${kanal.guild.name})`);

  try {
    await kanal.setRTCRegion(bolge, 'Otomatik ses sunucusuna bağlanılamadı');
  } catch (err) {
    logger.error(`Ses bölgesi "${bolge}" olarak ayarlanamadı`, err);
    return false;
  }

  try {
    state.connection.destroy();
  } catch {
    // zaten kapanmış olabilir
  }

  state.connection = baglantiKur(kanal.guild, kanal, state.player);
  return true;
}

async function baglantiyiBekle(state, guildId) {
  for (;;) {
    try {
      await entersState(state.connection, VoiceConnectionStatus.Ready, BAGLANTI_BEKLEME_MS);
      return true;
    } catch (err) {
      logger.error(
        `Sesli kanala bağlanılamadı (sunucu: ${guildId}, durum: ${state.connection.state.status}, ${agAsamasi(state.connection)})`,
        err
      );

      // State bu arada yok edilmişse (stop, kanal boşaldı vb.) uğraşmayı bırak.
      if (getState(guildId) !== state) return false;

      if (await bolgeDegistirVeYenidenBagla(state, guildId)) continue;

      const sebep = state.denenenBolgeler.length
        ? `Denediğim bölgeler: ${state.denenenBolgeler.join(', ')}. Kanalın **Bölge Geçersiz Kılma** ayarını elle değiştirmeyi dene.`
        : 'Kanalda **Bağlan**, **Konuş** ve bölge değiştirebilmem için **Kanalları Yönet** iznim var mı bir bak.';
      state.textChannel.send(`❌ Sesli kanala bağlanamadım. ${sebep}`).catch(() => {});
      destroyState(guildId);
      return false;
    }
  }
}

async function playNext(guildId) {
  const state = guildStates.get(guildId);
  if (!state) return;

  requeueFinished(state);
  state.skipRequested = false;

  const next = state.queue.shift();
  if (!next) {
    state.current = null;
    // Sıra bitince hemen çıkmıyoruz; kısa süre içinde yeni şarkı eklenirse (enqueueMany bu timer'ı
    // temizler) kanalda kalınmaya devam edilsin diye bekliyoruz.
    clearTimeout(state.queueBittiTimer);
    state.queueBittiTimer = setTimeout(() => {
      if (getState(guildId) !== state) return;
      if (state.current || state.queue.length > 0) return;
      destroyState(guildId);
    }, SIRA_BITTI_BEKLEME_MS);
    return;
  }

  state.current = next;
  state.killStream?.();

  // Bağlantı hazır olmadan çalmaya başlarsak ses gitmiyor ve hiçbir hata da çıkmıyor.
  if (!(await baglantiyiBekle(state, guildId))) return;

  try {
    const { stream, kill } = ytdlp.createStream(next.url, (err) => {
      logger.error('yt-dlp hatası', err);
      // Döngü modunda bozuk şarkı sonsuza kadar yeniden denenmesin.
      next.failed = true;
      if (state.current === next) {
        state.textChannel.send(`⚠️ **${next.title}** çekilemedi (${err.message}).`).catch(() => {});
      }
    });
    state.killStream = kill;
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    state.player.play(resource);
    sendPanel(state);
  } catch (err) {
    logger.error('Şarkı çalınırken hata oluştu', err);
    next.failed = true;
    state.textChannel.send(`⚠️ **${next.title}** çalınamadı, sıradakine geçiyorum.`).catch(() => {});
    playNext(guildId);
  }
}

// Bağlantı hem ilk kurulumda hem de bölge değişiminden sonra aynı şekilde kuruluyor.
function baglantiKur(guild, voiceChannel, player) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  connection.subscribe(player);

  // Bağlantı durumları, "çalmıyor ama hata da yok" vakalarını ayıklamak için loglanıyor.
  connection.on('stateChange', (eski, yeni) => {
    // Hazır olan bağlantının ses sunucusunu da yazıyoruz; çalışan ve çalışmayan sunucuları kıyaslamayı sağlıyor.
    const ek = yeni.status === VoiceConnectionStatus.Ready ? ` (${agAsamasi(connection)})` : '';
    logger.info(`Ses bağlantısı [${guild.name}]: ${eski.status} -> ${yeni.status}${ek}`);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      destroyState(guild.id);
    }
  });

  return connection;
}

function createState(guild, voiceChannel, textChannel) {
  const player = createAudioPlayer();
  const connection = baglantiKur(guild, voiceChannel, player);

  const state = {
    connection,
    player,
    queue: [],
    current: null,
    textChannel,
    voiceChannel,
    loop: 'kapali',
    skipRequested: false,
    leaveTimer: null,
    queueBittiTimer: null,
    panelMessage: null,
    denenenBolgeler: [],
  };

  player.on('stateChange', (eski, yeni) => {
    logger.info(`Oynatıcı [${guild.name}]: ${eski.status} -> ${yeni.status}`);
  });

  player.on(AudioPlayerStatus.Idle, () => playNext(guild.id));
  // Hatadan sonra oynatıcı zaten Idle'a geçip playNext'i tetikliyor; burada tekrar çağırmak şarkı atlatır.
  player.on('error', (err) => {
    logger.error('Ses oynatıcı hatası', err);
    if (state.current) {
      state.current.failed = true;
      textChannel.send(`⚠️ **${state.current.title}** çalınırken hata oldu (${err.message}), sıradakine geçiyorum.`).catch(() => {});
    }
  });

  guildStates.set(guild.id, state);
  return state;
}

function enqueueMany(guild, voiceChannel, textChannel, tracks) {
  const state = guildStates.get(guild.id) || createState(guild, voiceChannel, textChannel);
  const willStartImmediately = !state.current && state.queue.length === 0;

  state.queue.push(...tracks);

  if (willStartImmediately) {
    clearTimeout(state.queueBittiTimer);
    state.queueBittiTimer = null;
    playNext(guild.id);
  }

  return willStartImmediately;
}

function enqueue(guild, voiceChannel, textChannel, track) {
  return enqueueMany(guild, voiceChannel, textChannel, [track]);
}

function skip(guildId) {
  const state = getState(guildId);
  if (!state) return;
  state.skipRequested = true;
  state.player.stop();
}

// Oynatıcı zaten Idle'sa player.stop() hiçbir olay tetiklemiyor ve bot kanalda asılı kalıyordu;
// bu yüzden kuyruğun boşalmasını beklemeden bağlantıyı doğrudan kapatıyoruz.
function stop(guildId) {
  const state = getState(guildId);
  if (!state) return;
  state.queue = [];
  state.loop = 'kapali';
  state.skipRequested = true;
  state.current = null;
  destroyState(guildId);
}

function pause(guildId) {
  const state = getState(guildId);
  if (!state) return;
  state.player.pause();
  refreshPanel(guildId);
}

function resume(guildId) {
  const state = getState(guildId);
  if (!state) return;
  state.player.unpause();
  refreshPanel(guildId);
}

// Çalan şarkıyı belirtilen saniyeden itibaren yeniden başlatır.
async function seek(guildId, saniye) {
  const state = getState(guildId);
  if (!state?.current) return false;

  const hedef = state.current;
  state.killStream?.();

  let akis;
  try {
    akis = await ytdlp.createSeekStream(hedef.url, saniye, (err) => {
      logger.error('yt-dlp/ffmpeg seek hatası', err);
      if (state.current === hedef) {
        state.textChannel.send(`⚠️ **${hedef.title}** için saniyeye gidilemedi (${err.message}).`).catch(() => {});
      }
    });
  } catch (err) {
    logger.error('Seek akışı başlatılamadı', err);
    return false;
  }

  // Bu arada şarkı değişmiş ya da state yok edilmişse yeni akışı hemen kapat.
  if (getState(guildId) !== state || state.current !== hedef) {
    akis.kill();
    return false;
  }

  state.killStream = akis.kill;
  hedef.seekOffsetMs = saniye * 1000;
  const resource = createAudioResource(akis.stream, { inputType: StreamType.Raw });
  state.player.play(resource);
  refreshPanel(guildId);
  return true;
}

function setLoop(guildId, mod) {
  const state = getState(guildId);
  if (!state) return null;
  const yeniMod = mod ?? LOOP_MODLARI[(LOOP_MODLARI.indexOf(state.loop) + 1) % LOOP_MODLARI.length];
  state.loop = yeniMod;
  refreshPanel(guildId);
  return yeniMod;
}

function shuffle(guildId) {
  const state = getState(guildId);
  if (!state) return 0;
  const q = state.queue;
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  refreshPanel(guildId);
  return q.length;
}

function insanSayisi(kanal) {
  return kanal.members.filter((m) => !m.user.bot).size;
}

// Kısa kopmalarda kuyruk kaybolmasın diye kanal boşalınca hemen değil, bekleme süresinden sonra çıkılır.
function checkEmptyChannel(guild) {
  const state = getState(guild.id);
  if (!state) return;

  const kanal = guild.members.me?.voice?.channel;
  if (!kanal) return;

  if (insanSayisi(kanal) > 0) {
    clearTimeout(state.leaveTimer);
    state.leaveTimer = null;
    return;
  }
  if (state.leaveTimer) return;

  state.leaveTimer = setTimeout(() => {
    state.leaveTimer = null;
    if (getState(guild.id) !== state) return;
    const guncelKanal = guild.members.me?.voice?.channel;
    if (guncelKanal && insanSayisi(guncelKanal) > 0) return;

    state.textChannel.send('👋 Kanalda kimse kalmadı, ben de kalkıyorum.').catch(() => {});
    destroyState(guild.id);
  }, BOS_KANAL_BEKLEME_MS);
}

module.exports = {
  LOOP_MODLARI,
  enqueue,
  enqueueMany,
  getState,
  skip,
  stop,
  pause,
  resume,
  seek,
  setLoop,
  shuffle,
  checkEmptyChannel,
  refreshPanel,
};
