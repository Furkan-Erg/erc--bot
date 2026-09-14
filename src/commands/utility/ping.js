const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription("Check the bot's latency."),
  async execute(interaction) {
    const sent = await interaction.reply({ embeds: [infoEmbed('Pinging...')], fetchReply: true });
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;

    await interaction.editReply({
      embeds: [infoEmbed(`🏓 Pong! Roundtrip: **${roundTrip}ms** | WebSocket: **${interaction.client.ws.ping}ms**`)],
    });
  },
};
