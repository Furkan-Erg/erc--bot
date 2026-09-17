const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { infoEmbed } = require('../../utils/embeds');
const { URUNLER } = require('../../content/dukkan');

module.exports = {
  data: new SlashCommandBuilder().setName('dukkan').setDescription('Mahalle dükkânındaki ürünleri listele.'),
  async execute(interaction) {
    const satirlar = URUNLER.map(
      (u) => `${u.emoji} **${u.ad}** — **${u.fiyat}** TL · \`${u.id}\`\n${u.aciklama}`
    );

    const embed = infoEmbed(satirlar.join('\n\n'))
      .setTitle('🏪 Mahalle Dükkânı')
      .setFooter({ text: `Satın almak için: ${config.prefix}satinal <ürün> [adet]` });

    await interaction.reply({ embeds: [embed] });
  },
};
