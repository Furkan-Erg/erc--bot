const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed } = require('../../utils/embeds');
const { ROASTS, SELF_ROASTS } = require('../../content/roasts');
const { createCooldownTracker } = require('../../utils/memoryCooldown');
const { formatDuration } = require('../../utils/cooldowns');

const COOLDOWN_MS = 10_000;
const cooldown = createCooldownTracker(COOLDOWN_MS);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sok')
    .setDescription('Birine (ya da kendine) dostça bir laf sok.')
    .addUserOption((opt) => opt.setName('user').setDescription('Hedef (boş bırakırsan kendine sokarsın)').setRequired(false)),
  async execute(interaction) {
    const key = `${interaction.guildId}:${interaction.user.id}`;
    const remaining = cooldown.getRemaining(key);

    if (remaining > 0) {
      await interaction.reply({
        embeds: [warnEmbed(`⏳ Bu kadar da laf sokulmaz, biraz sakinleş. **${formatDuration(remaining)}** sonra tekrar dene.`)],
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser('user') || interaction.user;
    const isSelf = target.id === interaction.user.id;
    const pool = isSelf ? SELF_ROASTS : ROASTS;
    const line = pick(pool).replace('{user}', `<@${target.id}>`);

    cooldown.markUsed(key);

    await interaction.reply({ embeds: [infoEmbed(`🗡️ ${line}`)] });
  },
};
