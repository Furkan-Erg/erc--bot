const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const { DOLMUS_SOZLERI } = require('../../content/dolmus');

module.exports = {
  data: new SlashCommandBuilder().setName('dolmus').setDescription("Onat'ın dolmuş maceralarından rastgele bir kesit."),
  async execute(interaction) {
    const soz = DOLMUS_SOZLERI[Math.floor(Math.random() * DOLMUS_SOZLERI.length)];
    await interaction.reply({ embeds: [infoEmbed(`🚐 ${soz}`)] });
  },
};
