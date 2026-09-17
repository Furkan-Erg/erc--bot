const { SlashCommandBuilder } = require('discord.js');
const levelsRepo = require('../../database/repositories/levelsRepo');
const { infoEmbed } = require('../../utils/embeds');
const { levelInfo } = require('../../utils/levels');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder().setName('seviyeler').setDescription('Sunucunun en aktif üyelerini göster.'),
  async execute(interaction) {
    const top = levelsRepo.getTop(interaction.guildId, 10);

    if (top.length === 0) {
      await interaction.reply({ embeds: [infoEmbed('Henüz kimse XP kazanmamış. Biraz sohbet edin be!')] });
      return;
    }

    const lines = top.map(
      (row, i) => `${MEDALS[i] || `${i + 1}.`} <@${row.user_id}> — Seviye **${levelInfo(row.xp).level}** (${row.xp} XP)`
    );

    await interaction.reply({ embeds: [infoEmbed(lines.join('\n')).setTitle('📊 Muhabbetin Kralları')] });
  },
};
