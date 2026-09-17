const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Botun gecikmesine bak.'),
  async execute(interaction) {
    const sent = await interaction.reply({ embeds: [infoEmbed('Ping atılıyor...')], fetchReply: true });
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;

    await interaction.editReply({
      embeds: [infoEmbed(`🏓 Pong! Gidiş-dönüş: **${roundTrip}ms** | WebSocket: **${interaction.client.ws.ping}ms**`)],
    });
  },
};
