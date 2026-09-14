const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { infoEmbed } = require('../../utils/embeds');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('Show the top coin balances in this server.'),
  async execute(interaction) {
    const top = economyRepo.getTopBalances(interaction.guildId, 10);

    if (top.length === 0) {
      await interaction.reply({ embeds: [infoEmbed('No one has any coins yet. Try `/daily` or `/work`!')] });
      return;
    }

    const lines = top.map((row, i) => `${MEDALS[i] || `${i + 1}.`} <@${row.user_id}> — **${row.balance}** coins`);

    await interaction.reply({ embeds: [infoEmbed(lines.join('\n')).setTitle('🏆 Leaderboard')] });
  },
};
