const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const { BURCLAR, BURC_EMOJI, GENEL, ASK, PARA } = require('../../content/burclar');

function asciiye(str) {
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

function burcBul(girdi) {
  const aranan = asciiye(girdi.trim());
  return BURCLAR.find((b) => asciiye(b) === aranan) || null;
}

// Aynı gün aynı burç için aynı yorum çıksın.
function gununSecimi(tohum, arr) {
  let hash = 0;
  for (const ch of tohum) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return arr[hash % arr.length];
}

function bugun() {
  return new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('burc')
    .setDescription('Günlük burç yorumu.')
    .addStringOption((opt) => opt.setName('burc').setDescription('Burcun (örn. koç, akrep)').setRequired(true)),
  async execute(interaction) {
    const burc = burcBul(interaction.options.getString('burc', true));

    if (!burc) {
      await interaction.reply({ embeds: [errorEmbed(`Böyle bir burç yok. Seçenekler: ${BURCLAR.join(', ')}`)] });
      return;
    }

    const tarih = bugun();
    const sans = (gununSecimi(`${tarih}:${burc}:sans`, [1, 2, 3, 4, 5]));

    const embed = infoEmbed(
      [
        `🔮 **Genel:** ${gununSecimi(`${tarih}:${burc}:genel`, GENEL)}`,
        `💘 **Aşk:** ${gununSecimi(`${tarih}:${burc}:ask`, ASK)}`,
        `💸 **Para:** ${gununSecimi(`${tarih}:${burc}:para`, PARA)}`,
        '',
        `🍀 **Şans:** ${'⭐'.repeat(sans)}${'☆'.repeat(5 - sans)}`,
      ].join('\n')
    )
      .setTitle(`${BURC_EMOJI[burc]} ${burc.toLocaleUpperCase('tr-TR')} — ${tarih}`)
      .setFooter({ text: 'Bilimsel değildir, ama sen yine de dikkat et.' });

    await interaction.reply({ embeds: [embed] });
  },
};
