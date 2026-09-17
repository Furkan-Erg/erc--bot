const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Çalmayı durdur, kuyruğu boşalt ve kanaldan çık.'),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state) {
      await interaction.reply({ embeds: [warnEmbed('Zaten çalan bir şey yok.')], ephemeral: true });
      return;
    }

    musicManager.stop(interaction.guildId);
    await interaction.reply({ embeds: [infoEmbed('⏹️ Durdurdum, kuyruk tertemiz. Görüşürüz dayı.')] });
  },
};
