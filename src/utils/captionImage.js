const { createCanvas, loadImage } = require('canvas');
const { pngBuffer } = require('./pngBuffer');

function drawImpactText(ctx, text, x, y, maxWidth) {
  // Impact sadece Windows'ta var; Linux/Docker'da font bulunamazsa canvas yazıyı boş kutu olarak çizer.
  ctx.font = `bold ${Math.floor(maxWidth / 12)}px Impact, "DejaVu Sans", "Noto Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(2, Math.floor(maxWidth / 150));
  const upper = text.toLocaleUpperCase('tr-TR');
  ctx.strokeText(upper, x, y, maxWidth - 20);
  ctx.fillText(upper, x, y, maxWidth - 20);
}

// Devasa görseller canvas'ı ve belleği şişirip botu (dolayısıyla müziği) kilitlemesin.
const EN_FAZLA_PIKSEL = 4096 * 4096;

async function renderCaption(imageUrl, topText, bottomText) {
  const image = await loadImage(imageUrl);
  if (image.width * image.height > EN_FAZLA_PIKSEL) throw new Error('Görsel çok büyük');
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  if (topText) drawImpactText(ctx, topText, image.width / 2, image.height * 0.1 + 30, image.width);
  if (bottomText) drawImpactText(ctx, bottomText, image.width / 2, image.height * 0.95, image.width);

  return pngBuffer(canvas);
}

module.exports = { drawImpactText, renderCaption };
