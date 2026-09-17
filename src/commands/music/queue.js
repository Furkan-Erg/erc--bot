const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Sıradaki şarkıları göster.'),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state || (!state.current && state.queue.length === 0)) {
      await interaction.reply({ embeds: [infoEmbed('Kuyruk tertemiz, ekleyecek bir şey yok.')] });
      return;
    }

    const lines = [];
    if (state.current) {
      lines.push(`▶️ **${state.current.title}** — çalıyor (ekleyen: ${state.current.requestedBy})`);
    }
    state.queue.forEach((track, i) => {
      lines.push(`${i + 1}. ${track.title} — ekleyen: ${track.requestedBy}`);
    });

    await interaction.reply({ embeds: [infoEmbed(lines.join('\n')).setTitle('🎵 Sıra')] });
  },
};
