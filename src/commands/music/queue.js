const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

const GOSTERILECEK = 15;
const LOOP_METNI = { kapali: 'kapalı', sarki: '🔂 şarkı', kuyruk: '🔁 kuyruk' };

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
    state.queue.slice(0, GOSTERILECEK).forEach((track, i) => {
      lines.push(`${i + 1}. ${track.title} — ekleyen: ${track.requestedBy}`);
    });
    if (state.queue.length > GOSTERILECEK) {
      lines.push(`…ve **${state.queue.length - GOSTERILECEK}** şarkı daha`);
    }

    const embed = infoEmbed(lines.join('\n'))
      .setTitle('🎵 Sıra')
      .setFooter({ text: `Sırada ${state.queue.length} şarkı · Döngü: ${LOOP_METNI[state.loop]}` });

    await interaction.reply({ embeds: [embed] });
  },
};
