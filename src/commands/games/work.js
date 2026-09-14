const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, warnEmbed } = require('../../utils/embeds');
const { getRemainingCooldown, formatDuration } = require('../../utils/cooldowns');

const COOLDOWN_MS = 60 * 60 * 1000;
const MIN_REWARD = 20;
const MAX_REWARD = 80;

const JOBS = [
  'debugged a production incident for',
  'walked a dog for',
  'delivered pizza for',
  'moderated a chaotic voice channel for',
  'wrote unit tests for',
  'fixed a merge conflict for',
  'streamed a boring tutorial for',
];

module.exports = {
  data: new SlashCommandBuilder().setName('work').setDescription('Work a small job for some coins.'),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const lastWork = economyRepo.getLastWork(guildId, user.id);
    const remaining = getRemainingCooldown(lastWork, COOLDOWN_MS);

    if (remaining > 0) {
      await interaction.reply({
        embeds: [warnEmbed(`⏳ You're tired. Rest for **${formatDuration(remaining)}** before working again.`)],
        ephemeral: true,
      });
      return;
    }

    const reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    economyRepo.setLastWork(guildId, user.id, Date.now());
    const balance = economyRepo.addBalance(guildId, user.id, reward);

    await interaction.reply({
      embeds: [successEmbed(`💼 You ${job} a stranger and earned **${reward}** coins! Balance: **${balance}**.`)],
    });
  },
};
