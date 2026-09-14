const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, warnEmbed } = require('../../utils/embeds');
const { getRemainingCooldown, formatDuration } = require('../../utils/cooldowns');

const DAILY_AMOUNT = 200;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily coins.'),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const lastDaily = economyRepo.getLastDaily(guildId, user.id);
    const remaining = getRemainingCooldown(lastDaily, COOLDOWN_MS);

    if (remaining > 0) {
      await interaction.reply({
        embeds: [warnEmbed(`⏳ You already claimed your daily reward. Come back in **${formatDuration(remaining)}**.`)],
        ephemeral: true,
      });
      return;
    }

    economyRepo.setLastDaily(guildId, user.id, Date.now());
    const balance = economyRepo.addBalance(guildId, user.id, DAILY_AMOUNT);

    await interaction.reply({
      embeds: [successEmbed(`🎁 You claimed **${DAILY_AMOUNT}** coins! Balance: **${balance}**.`)],
    });
  },
};
