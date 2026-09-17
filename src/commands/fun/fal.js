const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed } = require('../../utils/embeds');
const { SEKILLER, YORUMLAR, KAPANISLAR } = require('../../content/fal');
const { createCooldownTracker } = require('../../utils/memoryCooldown');
const { formatDuration } = require('../../utils/cooldowns');

const cooldown = createCooldownTracker(30_000);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function farkliIki(arr) {
  const ilk = pick(arr);
  let ikinci = pick(arr);
  while (ikinci === ilk && arr.length > 1) ikinci = pick(arr);
  return [ilk, ikinci];
}

module.exports = {
  data: new SlashCommandBuilder().setName('fal').setDescription('Kahve falına bakayım.'),
  async execute(interaction) {
    const key = `${interaction.guildId}:${interaction.user.id}`;
    const remaining = cooldown.getRemaining(key);
    if (remaining > 0) {
      await interaction.reply({
        embeds: [warnEmbed(`☕ Fincan daha soğumadı. **${formatDuration(remaining)}** sonra gel.`)],
      });
      return;
    }
    cooldown.markUsed(key);

    const [yorum1, yorum2] = farkliIki(YORUMLAR);
    const metin = `${pick(SEKILLER)}... bu demek oluyor ki ${yorum1}.\n\nBir de ${yorum2}.\n\n_${pick(KAPANISLAR)}_`;

    await interaction.reply({ embeds: [infoEmbed(metin).setTitle(`☕ ${interaction.user.username} için kahve falı`)] });
  },
};
