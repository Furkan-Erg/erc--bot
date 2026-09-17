const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('np').setDescription('Şu an çalan şarkıyı göster.'),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state || !state.current) {
      await interaction.reply({ embeds: [infoEmbed('Şu an çalan bir şey yok.')] });
      return;
    }

    await interaction.reply({
      embeds: [infoEmbed(`Ekleyen: ${state.current.requestedBy}`).setTitle(`🎶 ${state.current.title}`)],
    });
  },
};
