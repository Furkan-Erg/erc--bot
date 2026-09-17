const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { renderCaption } = require('../../utils/captionImage');
const { errorEmbed } = require('../../utils/embeds');
const { CAPSLE_METINLERI } = require('../../content/capsleMetinleri');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('capsle')
    .setDescription('Bir görseli Türkçe internet mizahıyla capsle.')
    .addStringOption((opt) => opt.setName('image_url').setDescription('Görselin URL\'si').setRequired(true))
    .addStringOption((opt) => opt.setName('top').setDescription('Üst yazı (boş bırakırsan rastgele seçilir)').setRequired(false))
    .addStringOption((opt) => opt.setName('bottom').setDescription('Alt yazı (boş bırakırsan rastgele seçilir)').setRequired(false)),
  async execute(interaction) {
    const imageUrl = interaction.options.getString('image_url', true);
    let topText = interaction.options.getString('top') || '';
    let bottomText = interaction.options.getString('bottom') || '';

    if (!topText && !bottomText) {
      const rastgele = pick(CAPSLE_METINLERI);
      topText = rastgele.top;
      bottomText = rastgele.bottom;
    }

    await interaction.deferReply();

    let buffer;
    try {
      buffer = await renderCaption(imageUrl, topText, bottomText);
    } catch {
      await interaction.editReply({ embeds: [errorEmbed('O görsel URL\'sini yükleyemedim.')] });
      return;
    }

    const attachment = new AttachmentBuilder(buffer, { name: 'capsle.png' });

    await interaction.editReply({ files: [attachment] });
  },
};
