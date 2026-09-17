const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');
const panel = require('../../music/panel');

module.exports = {
  data: new SlashCommandBuilder().setName('np').setDescription('Şu an çalan şarkıyı ve kumandayı göster.'),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state || !state.current) {
      await interaction.reply({ embeds: [infoEmbed('Şu an çalan bir şey yok.')] });
      return;
    }

    // Panel yukarıda kaybolduysa kumandayı tekrar getirmenin yolu.
    await interaction.reply(panel.build(state));
  },
};
