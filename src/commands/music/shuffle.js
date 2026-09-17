const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Sıradaki şarkıları karıştır.'),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state || state.queue.length < 2) {
      await interaction.reply({ embeds: [warnEmbed('Karıştıracak kadar şarkı yok, en az 2 tane lazım.')] });
      return;
    }

    const adet = musicManager.shuffle(interaction.guildId);
    await interaction.reply({ embeds: [infoEmbed(`🔀 Sıradaki **${adet}** şarkıyı karıştırdım.`)] });
  },
};
