const config = require('../config');
const { infoEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (!config.welcomeChannelId) return;

    try {
      const channel = await member.guild.channels.fetch(config.welcomeChannelId);
      if (!channel?.isTextBased()) return;

      await channel.send({
        embeds: [
          infoEmbed(`👋 Hoş geldin **${member.guild.name}**'e, <@${member.id}>! Umarım çayın hazırdır, uzun süre kalacaksın.`),
        ],
      });
    } catch (err) {
      logger.error('Failed to send welcome message', err);
    }
  },
};
