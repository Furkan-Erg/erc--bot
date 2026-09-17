const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Çalan şarkıyı atla.'),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state || !state.current) {
      await interaction.reply({ embeds: [warnEmbed('Şu an çalan bir şey yok ki atlayayım.')], ephemeral: true });
      return;
    }

    const skipped = state.current.title;
    musicManager.skip(interaction.guildId);

    await interaction.reply({ embeds: [infoEmbed(`⏭️ Atlandı: **${skipped}**`)] });
  },
};
