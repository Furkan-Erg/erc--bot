const { SlashCommandBuilder } = require('discord.js');
const remindersRepo = require('../../database/repositories/remindersRepo');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

function parseDuration(input) {
  const regex = /(\d+)\s*(s|m|h|d)/gi;
  let match;
  let totalMs = 0;
  let matched = false;

  while ((match = regex.exec(input)) !== null) {
    matched = true;
    totalMs += parseInt(match[1], 10) * UNIT_MS[match[2].toLowerCase()];
  }

  return matched ? totalMs : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder.')
    .addStringOption((opt) =>
      opt.setName('duration').setDescription('e.g. 10m, 1h30m, 2d').setRequired(true)
    )
    .addStringOption((opt) => opt.setName('message').setDescription('What to remind you about').setRequired(true)),
  async execute(interaction) {
    const durationInput = interaction.options.getString('duration', true);
    const message = interaction.options.getString('message', true);

    const durationMs = parseDuration(durationInput);
    if (!durationMs || durationMs <= 0) {
      await interaction.reply({
        embeds: [errorEmbed('Invalid duration. Use a format like `10m`, `1h30m`, or `2d`.')],
        ephemeral: true,
      });
      return;
    }

    const remindAt = Date.now() + durationMs;
    remindersRepo.createReminder(interaction.user.id, interaction.channelId, message, remindAt);

    await interaction.reply({
      embeds: [successEmbed(`⏰ Got it, I'll remind you <t:${Math.floor(remindAt / 1000)}:R>.`)],
    });
  },
};
