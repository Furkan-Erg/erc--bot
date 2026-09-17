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
const ytdl = require('@distube/ytdl-core');
const logger = require('../utils/logger');

const guildStates = new Map();

function getState(guildId) {
  return guildStates.get(guildId);
}

function destroyState(guildId) {
  const state = guildStates.get(guildId);
  if (!state) return;
  guildStates.delete(guildId);
  try {
    state.player.stop(true);
    state.connection.destroy();
  } catch {
    // bağlantı zaten kapanmış olabilir, önemli değil
  }
}

async function playNext(guildId) {
  const state = guildStates.get(guildId);
  if (!state) return;

  const next = state.queue.shift();
  if (!next) {
    state.current = null;
    destroyState(guildId);
    return;
  }

  state.current = next;

  try {
    const stream = ytdl(next.url, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    state.player.play(resource);
  } catch (err) {
    logger.error('Şarkı çalınırken hata oluştu', err);
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

  const state = { connection, player, queue: [], current: null, textChannel };

  player.on(AudioPlayerStatus.Idle, () => playNext(guild.id));
  player.on('error', (err) => {
    logger.error('Ses oynatıcı hatası', err);
    const failedTitle = state.current?.title;
    if (failedTitle) {
      textChannel.send(`⚠️ **${failedTitle}** çalınırken hata oldu (${err.message}), sıradakine geçiyorum.`).catch(() => {});
    }
    playNext(guild.id);
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

function enqueue(guild, voiceChannel, textChannel, track) {
  const state = guildStates.get(guild.id) || createState(guild, voiceChannel, textChannel);
  const willStartImmediately = !state.current && state.queue.length === 0;

  state.queue.push(track);

  if (willStartImmediately) {
    playNext(guild.id);
  }

  return willStartImmediately;
}

function skip(guildId) {
  const state = getState(guildId);
  if (state) state.player.stop();
}

function stop(guildId) {
  const state = getState(guildId);
  if (!state) return;
  state.queue = [];
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

module.exports = { enqueue, getState, skip, stop, pause, resume };
