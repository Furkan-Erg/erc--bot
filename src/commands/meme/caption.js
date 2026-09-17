const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { renderCaption } = require('../../utils/captionImage');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caption')
    .setDescription('Bir görsele meme yazısı ekle.')
    .addStringOption((opt) => opt.setName('image_url').setDescription('Görselin URL\'si').setRequired(true))
    .addStringOption((opt) => opt.setName('top').setDescription('Üst yazı').setRequired(false))
    .addStringOption((opt) => opt.setName('bottom').setDescription('Alt yazı').setRequired(false)),
  async execute(interaction) {
    const imageUrl = interaction.options.getString('image_url', true);
    const topText = interaction.options.getString('top') || '';
    const bottomText = interaction.options.getString('bottom') || '';

    if (!topText && !bottomText) {
      await interaction.reply({ embeds: [errorEmbed('En azından üst ya da alt yazıdan birini gir.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    let buffer;
    try {
      buffer = await renderCaption(imageUrl, topText, bottomText);
    } catch {
      await interaction.editReply({ embeds: [errorEmbed('O görsel URL\'sini yükleyemedim.')] });
      return;
    }

    const attachment = new AttachmentBuilder(buffer, { name: 'caption.png' });

    await interaction.editReply({ files: [attachment] });
  },
};
