const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Çalan şarkıyı duraklat.'),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state || !state.current) {
      await interaction.reply({ embeds: [warnEmbed('Duraklatacak bir şey yok.')], ephemeral: true });
      return;
    }

    musicManager.pause(interaction.guildId);
    await interaction.reply({ embeds: [infoEmbed('⏸️ Durduruldu, nefes alalım biraz.')] });
  },
};
