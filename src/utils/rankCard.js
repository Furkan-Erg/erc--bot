const GENISLIK = 800;
const YUKSEKLIK = 240;
const FONT = '"DejaVu Sans", "Noto Sans", Arial, sans-serif';

function yuvarlakDikdortgen(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// canvas native modülü bozuksa komutun tamamen çökmemesi için burada geç yükleniyor.
async function renderRankCard({ username, avatarUrl, level, current, needed, rank, totalXp }) {
  const { createCanvas, loadImage } = require('canvas');
  const canvas = createCanvas(GENISLIK, YUKSEKLIK);
  const ctx = canvas.getContext('2d');

  yuvarlakDikdortgen(ctx, 0, 0, GENISLIK, YUKSEKLIK, 24);
  ctx.fillStyle = '#1e1f22';
  ctx.fill();

  ctx.fillStyle = '#e30a17';
  yuvarlakDikdortgen(ctx, 0, 0, 12, YUKSEKLIK, 6);
  ctx.fill();

  const avatarBoyut = 170;
  const avatarX = 40;
  const avatarY = (YUKSEKLIK - avatarBoyut) / 2;
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarBoyut / 2, avatarY + avatarBoyut / 2, avatarBoyut / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarBoyut, avatarBoyut);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#313338';
    ctx.beginPath();
    ctx.arc(avatarX + avatarBoyut / 2, avatarY + avatarBoyut / 2, avatarBoyut / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const metinX = avatarX + avatarBoyut + 36;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 34px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(username, metinX, 78, GENISLIK - metinX - 40);

  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#b5bac1';
  ctx.fillText(`Sıra #${rank}  ·  Toplam ${totalXp} XP`, metinX, 116);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText(`${level}`, GENISLIK - 40, 78);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = '#b5bac1';
  ctx.fillText('SEVİYE', GENISLIK - 40, 100);

  const barX = metinX;
  const barY = 150;
  const barW = GENISLIK - metinX - 40;
  const barH = 32;
  yuvarlakDikdortgen(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fillStyle = '#313338';
  ctx.fill();

  const oran = Math.max(0, Math.min(1, current / needed));
  if (oran > 0) {
    yuvarlakDikdortgen(ctx, barX, barY, Math.max(barH, barW * oran), barH, barH / 2);
    ctx.fillStyle = '#e30a17';
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = '#b5bac1';
  ctx.fillText(`${current} / ${needed} XP`, barX + barW, barY + barH + 26);

  return canvas.toBuffer('image/png');
}

module.exports = { renderRankCard };
