const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Duraklatılan şarkıya devam et.'),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state || !state.current) {
      await interaction.reply({ embeds: [warnEmbed('Devam ettirecek bir şey yok.')], ephemeral: true });
      return;
    }

    musicManager.resume(interaction.guildId);
    await interaction.reply({ embeds: [infoEmbed('▶️ Devam ediyoruz.')] });
  },
};
