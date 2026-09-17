const { createCanvas, loadImage } = require('canvas');

function drawImpactText(ctx, text, x, y, maxWidth) {
  ctx.font = `${Math.floor(maxWidth / 12)}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(2, Math.floor(maxWidth / 150));
  const upper = text.toLocaleUpperCase('tr-TR');
  ctx.strokeText(upper, x, y, maxWidth - 20);
  ctx.fillText(upper, x, y, maxWidth - 20);
}

async function renderCaption(imageUrl, topText, bottomText) {
  const image = await loadImage(imageUrl);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  if (topText) drawImpactText(ctx, topText, image.width / 2, image.height * 0.1 + 30, image.width);
  if (bottomText) drawImpactText(ctx, bottomText, image.width / 2, image.height * 0.95, image.width);

  return canvas.toBuffer('image/png');
}

module.exports = { drawImpactText, renderCaption };
