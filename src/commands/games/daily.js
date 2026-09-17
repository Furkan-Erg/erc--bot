const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, warnEmbed } = require('../../utils/embeds');
const { getRemainingCooldown, formatDuration } = require('../../utils/cooldowns');

const DAILY_AMOUNT = 200;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Günlük harçlığını al.'),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const lastDaily = economyRepo.getLastDaily(guildId, user.id);
    const remaining = getRemainingCooldown(lastDaily, COOLDOWN_MS);

    if (remaining > 0) {
      await interaction.reply({
        embeds: [warnEmbed(`⏳ Bugünkü harçlığını zaten aldın. **${formatDuration(remaining)}** sonra tekrar gel.`)],
        ephemeral: true,
      });
      return;
    }

    economyRepo.setLastDaily(guildId, user.id, Date.now());
    const balance = economyRepo.addBalance(guildId, user.id, DAILY_AMOUNT);

    await interaction.reply({
      embeds: [successEmbed(`🎁 Günlük harçlığını aldın: **${DAILY_AMOUNT}** TL! Bakiye: **${balance}** TL.`)],
    });
  },
};
