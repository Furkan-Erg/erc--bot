const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, warnEmbed } = require('../../utils/embeds');
const { getRemainingCooldown, formatDuration } = require('../../utils/cooldowns');
const { JOBS } = require('../../content/jobs');

const COOLDOWN_MS = 60 * 60 * 1000;
const MIN_REWARD = 20;
const MAX_REWARD = 80;

module.exports = {
  data: new SlashCommandBuilder().setName('work').setDescription('Ufak bir iş yap, birkaç TL kazan.'),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const lastWork = economyRepo.getLastWork(guildId, user.id);
    const remaining = getRemainingCooldown(lastWork, COOLDOWN_MS);

    if (remaining > 0) {
      await interaction.reply({
        embeds: [warnEmbed(`⏳ Yoruldun be dayı, biraz dinlen. **${formatDuration(remaining)}** sonra tekrar çalışabilirsin.`)],
        ephemeral: true,
      });
      return;
    }

    const reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    economyRepo.setLastWork(guildId, user.id, Date.now());
    const balance = economyRepo.addBalance(guildId, user.id, reward);

    await interaction.reply({
      embeds: [successEmbed(`💼 ${job} ve **${reward}** TL kazandın! Bakiye: **${balance}** TL.`)],
    });
  },
};
