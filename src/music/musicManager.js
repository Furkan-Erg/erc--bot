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
const ytdlp = require('./ytdlp');
const panel = require('./panel');
const logger = require('../utils/logger');

const LOOP_MODLARI = ['kapali', 'sarki', 'kuyruk'];
const BOS_KANAL_BEKLEME_MS = 30_000;

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

async function playNext(guildId) {
  const state = guildStates.get(guildId);
  if (!state) return;

  requeueFinished(state);
  state.skipRequested = false;

  const next = state.queue.shift();
  if (!next) {
    state.current = null;
    destroyState(guildId);
    return;
  }

  state.current = next;
  state.killStream?.();

  // Bağlantı hazır olmadan çalmaya başlarsak ses gitmiyor ve hiçbir hata da çıkmıyor.
  try {
    await entersState(state.connection, VoiceConnectionStatus.Ready, 20_000);
  } catch (err) {
    logger.error(`Sesli kanala bağlanılamadı (sunucu: ${guildId}, durum: ${state.connection.state.status}, ${agAsamasi(state.connection)})`, err);
    state.textChannel
      .send('❌ Sesli kanala bağlanamadım. Kanalda **Bağlan** ve **Konuş** iznim var mı, kanal dolu mu bir bak.')
      .catch(() => {});
    destroyState(guildId);
    return;
  }

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

function createState(guild, voiceChannel, textChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  connection.subscribe(player);

  const state = {
    connection,
    player,
    queue: [],
    current: null,
    textChannel,
    loop: 'kapali',
    skipRequested: false,
    leaveTimer: null,
    panelMessage: null,
  };

  // Bağlantı ve oynatıcı durumları, "çalmıyor ama hata da yok" vakalarını ayıklamak için loglanıyor.
  connection.on('stateChange', (eski, yeni) => {
    logger.info(`Ses bağlantısı [${guild.name}]: ${eski.status} -> ${yeni.status}`);
  });
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

  guildStates.set(guild.id, state);
  return state;
}

function enqueueMany(guild, voiceChannel, textChannel, tracks) {
  const state = guildStates.get(guild.id) || createState(guild, voiceChannel, textChannel);
  const willStartImmediately = !state.current && state.queue.length === 0;

  state.queue.push(...tracks);

  if (willStartImmediately) {
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
  setLoop,
  shuffle,
  checkEmptyChannel,
  refreshPanel,
};
