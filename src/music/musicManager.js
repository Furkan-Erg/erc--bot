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
const logger = require('../utils/logger');

const LOOP_MODLARI = ['kapali', 'sarki', 'kuyruk'];
const BOS_KANAL_BEKLEME_MS = 30_000;

const guildStates = new Map();

function getState(guildId) {
  return guildStates.get(guildId);
}

function destroyState(guildId) {
  const state = guildStates.get(guildId);
  if (!state) return;
  guildStates.delete(guildId);
  clearTimeout(state.leaveTimer);
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
  };

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

function stop(guildId) {
  const state = getState(guildId);
  if (!state) return;
  state.queue = [];
  state.loop = 'kapali';
  state.skipRequested = true;
  state.player.stop();
}

function pause(guildId) {
  const state = getState(guildId);
  if (state) state.player.pause();
}

function resume(guildId) {
  const state = getState(guildId);
  if (state) state.player.unpause();
}

function setLoop(guildId, mod) {
  const state = getState(guildId);
  if (!state) return null;
  const yeniMod = mod ?? LOOP_MODLARI[(LOOP_MODLARI.indexOf(state.loop) + 1) % LOOP_MODLARI.length];
  state.loop = yeniMod;
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
};
