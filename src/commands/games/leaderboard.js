const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { infoEmbed } = require('../../utils/embeds');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('Bu sunucudaki en zengin dayıları göster.'),
  async execute(interaction) {
    const top = economyRepo.getTopBalances(interaction.guildId, 10);

    if (top.length === 0) {
      await interaction.reply({ embeds: [infoEmbed('Kimsenin cebinde para yok. `/daily` veya `/work` dene!')] });
      return;
    }

    const lines = top.map((row, i) => `${MEDALS[i] || `${i + 1}.`} <@${row.user_id}> — **${row.balance}** TL`);

    await interaction.reply({ embeds: [infoEmbed(lines.join('\n')).setTitle('🏆 Zenginler Listesi')] });
  },
};
