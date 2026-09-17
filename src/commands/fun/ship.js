const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const { yorumBul } = require('../../content/ship');

// Aynı ikili her seferinde aynı sonucu alsın diye ID'lerden deterministik yüzde üretilir.
function uyumYuzdesi(idA, idB) {
  const anahtar = [idA, idB].sort().join(':');
  let hash = 0;
  for (const ch of anahtar) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash % 101;
}

function bar(yuzde) {
  const dolu = Math.round(yuzde / 10);
  return '❤️'.repeat(dolu) + '🖤'.repeat(10 - dolu);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('İki kişinin uyumuna bak.')
    .addUserOption((opt) => opt.setName('kisi1').setDescription('Birinci kişi').setRequired(true))
    .addUserOption((opt) => opt.setName('kisi2').setDescription('İkinci kişi (boşsa sen)').setRequired(false)),
  async execute(interaction) {
    const kisi1 = interaction.options.getUser('kisi1', true);
    const kisi2 = interaction.options.getUser('kisi2') || interaction.user;

    if (kisi1.id === kisi2.id) {
      await interaction.reply({ embeds: [errorEmbed('Kendinle uyumun %100, tebrikler. Şimdi başka birini seç.')] });
      return;
    }

    const yuzde = uyumYuzdesi(kisi1.id, kisi2.id);
    const ciftAdi = kisi1.username.slice(0, Math.ceil(kisi1.username.length / 2)) + kisi2.username.slice(Math.floor(kisi2.username.length / 2));

    const embed = infoEmbed(`<@${kisi1.id}> 💞 <@${kisi2.id}>\n\n${bar(yuzde)} **%${yuzde}**\n\n${yorumBul(yuzde)}`).setTitle(
      `💘 ${ciftAdi}`
    );

    await interaction.reply({ embeds: [embed] });
  },
};
