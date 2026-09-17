const config = require('../config');
const logger = require('../utils/logger');
const { errorEmbed, infoEmbed, successEmbed } = require('../utils/embeds');
const { parseOptions, buildOptions } = require('../utils/commandOptionsAdapter');
const afkRepo = require('../database/repositories/afkRepo');
const levelsRepo = require('../database/repositories/levelsRepo');
const economyRepo = require('../database/repositories/economyRepo');
const { levelInfo } = require('../utils/levels');

const XP_COOLDOWN_MS = 60_000;
const MIN_XP = 10;
const MAX_XP = 20;
const SEVIYE_ODUL_CARPANI = 50;

function stripInteractionOnlyFlags(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const { ephemeral, fetchReply, ...rest } = payload;
  return rest;
}

function createMessageContext(message, values) {
  let repliedMessage = null;

  return {
    user: message.author,
    member: message.member,
    guild: message.guild,
    guildId: message.guildId,
    channel: message.channel,
    channelId: message.channelId,
    client: message.client,
    createdTimestamp: message.createdTimestamp,
    options: buildOptions(values),
    get replied() {
      return repliedMessage !== null;
    },
    deferred: false,
    async deferReply() {
      await message.channel.sendTyping().catch(() => {});
    },
    async reply(payload) {
      repliedMessage = await message.channel.send(stripInteractionOnlyFlags(payload));
      return repliedMessage;
    },
    async editReply(payload) {
      repliedMessage = repliedMessage
        ? await repliedMessage.edit(stripInteractionOnlyFlags(payload))
        : await message.channel.send(stripInteractionOnlyFlags(payload));
      return repliedMessage;
    },
    async followUp(payload) {
      return message.channel.send(stripInteractionOnlyFlags(payload));
    },
    async fetchReply() {
      return repliedMessage;
    },
  };
}

async function handleAfk(message, isCommand) {
  const { guildId, author } = message;

  const kendiAfk = afkRepo.getAfk(guildId, author.id);
  const afkKomutu = isCommand && message.content.slice(config.prefix.length).trim().toLowerCase().startsWith('afk');
  if (kendiAfk && !afkKomutu) {
    afkRepo.clearAfk(guildId, author.id);
    await message.reply({ embeds: [infoEmbed(`👋 Hoş geldin, AFK modundan çıktın.`)] }).catch(() => {});
  }

  const bildirimler = [];
  for (const user of message.mentions.users.values()) {
    if (user.id === author.id || user.bot) continue;
    const afk = afkRepo.getAfk(guildId, user.id);
    if (afk) {
      bildirimler.push(`💤 **${user.username}** şu an AFK: ${afk.reason} (<t:${Math.floor(afk.since / 1000)}:R>)`);
    }
  }
  if (bildirimler.length > 0) {
    await message
      .reply({ embeds: [infoEmbed(bildirimler.join('\n'))], allowedMentions: { repliedUser: false } })
      .catch(() => {});
  }
}

async function awardXp(message) {
  const { guildId, author } = message;
  const last = levelsRepo.getLastXpAt(guildId, author.id);
  if (last && Date.now() - last < XP_COOLDOWN_MS) return;

  const oncekiSeviye = levelInfo(levelsRepo.getXp(guildId, author.id)).level;
  const kazanc = MIN_XP + Math.floor(Math.random() * (MAX_XP - MIN_XP + 1));
  const yeniSeviye = levelInfo(levelsRepo.addXp(guildId, author.id, kazanc)).level;

  if (yeniSeviye > oncekiSeviye) {
    const odul = yeniSeviye * SEVIYE_ODUL_CARPANI;
    economyRepo.addBalance(guildId, author.id, odul);
    await message.channel
      .send({ embeds: [successEmbed(`🎉 <@${author.id}> seviye atladı: **${yeniSeviye}**! Muhabbet ödülü: **${odul}** TL.`)] })
      .catch(() => {});
  }
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    const isCommand = message.content.startsWith(config.prefix);

    if (message.guild) {
      try {
        await handleAfk(message, isCommand);
        if (!isCommand) await awardXp(message);
      } catch (err) {
        logger.error('Mesaj kancaları çalışırken hata oluştu', err);
      }
    }

    if (!isCommand) return;

    const withoutPrefix = message.content.slice(config.prefix.length).trim();
    if (!withoutPrefix) return;

    const spaceIndex = withoutPrefix.search(/\s/);
    const commandName = (spaceIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, spaceIndex)).toLowerCase();
    const rawArgs = spaceIndex === -1 ? '' : withoutPrefix.slice(spaceIndex + 1);

    const command = client.commands.get(commandName);
    if (!command) return;

    const optionsMeta = command.data.toJSON().options || [];
    const values = parseOptions(rawArgs, optionsMeta, message);
    const ctx = createMessageContext(message, values);

    try {
      await command.execute(ctx);
    } catch (err) {
      logger.error(`Error executing command ${commandName}`, err);
      const description = err?.message?.startsWith('Eksik') || err?.message?.startsWith('Bir kullanıcı')
        ? err.message
        : 'Bir şeyler ters gitti.';
      await message.channel.send({ embeds: [errorEmbed(description)] }).catch(() => {});
    }
  },
};
