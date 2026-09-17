const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed } = require('../../utils/embeds');
const { TEMPLATES, FILLERS } = require('../../content/sallama');
const { createCooldownTracker } = require('../../utils/memoryCooldown');
const { formatDuration } = require('../../utils/cooldowns');

const COOLDOWN_MS = 10_000;
const cooldown = createCooldownTracker(COOLDOWN_MS);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sallamaCevabiUret() {
  const template = pick(TEMPLATES);
  return template.replace(/\{(\w+)\}/g, (_, key) => (FILLERS[key] ? pick(FILLERS[key]) : key));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sallama')
    .setDescription('Sorduğun soruya kendinden emin, sallama bir cevap üretir.')
    .addStringOption((opt) => opt.setName('soru').setDescription('Ne sallayayım?').setRequired(true)),
  async execute(interaction) {
    const key = `${interaction.guildId}:${interaction.user.id}`;
    const remaining = cooldown.getRemaining(key);

    if (remaining > 0) {
      await interaction.reply({
        embeds: [warnEmbed(`⏳ Yavaş ol, tek nefeste bu kadar sallanmaz. **${formatDuration(remaining)}** sonra tekrar dene.`)],
        ephemeral: true,
      });
      return;
    }

    const soru = interaction.options.getString('soru', true);
    cooldown.markUsed(key);

    await interaction.reply({
      embeds: [infoEmbed(sallamaCevabiUret()).setTitle(`🎯 "${soru}"`)],
    });
  },
};
