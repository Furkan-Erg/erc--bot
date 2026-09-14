const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { errorEmbed } = require('../../utils/embeds');

function drawImpactText(ctx, text, x, y, maxWidth) {
  ctx.font = `${Math.floor(maxWidth / 12)}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(2, Math.floor(maxWidth / 150));
  const upper = text.toUpperCase();
  ctx.strokeText(upper, x, y, maxWidth - 20);
  ctx.fillText(upper, x, y, maxWidth - 20);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caption')
    .setDescription('Add meme-style caption text to an image.')
    .addStringOption((opt) => opt.setName('image_url').setDescription('URL of the image').setRequired(true))
    .addStringOption((opt) => opt.setName('top').setDescription('Top text').setRequired(false))
    .addStringOption((opt) => opt.setName('bottom').setDescription('Bottom text').setRequired(false)),
  async execute(interaction) {
    const imageUrl = interaction.options.getString('image_url', true);
    const topText = interaction.options.getString('top') || '';
    const bottomText = interaction.options.getString('bottom') || '';

    if (!topText && !bottomText) {
      await interaction.reply({ embeds: [errorEmbed('Provide at least a top or bottom caption.')], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    let image;
    try {
      image = await loadImage(imageUrl);
    } catch {
      await interaction.editReply({ embeds: [errorEmbed('Could not load that image URL.')] });
      return;
    }

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    if (topText) drawImpactText(ctx, topText, image.width / 2, image.height * 0.1 + 30, image.width);
    if (bottomText) drawImpactText(ctx, bottomText, image.width / 2, image.height * 0.95, image.width);

    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'caption.png' });

    await interaction.editReply({ files: [attachment] });
  },
};
