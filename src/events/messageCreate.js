const config = require('../config');
const logger = require('../utils/logger');
const { errorEmbed } = require('../utils/embeds');
const { parseOptions, buildOptions } = require('../utils/commandOptionsAdapter');

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

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

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
      const description = err?.message?.startsWith('Eksik') ? err.message : 'Bir şeyler ters gitti.';
      await message.channel.send({ embeds: [errorEmbed(description)] }).catch(() => {});
    }
  },
};
