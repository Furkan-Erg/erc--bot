const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const economyRepo = require('../../database/repositories/economyRepo');
const { infoEmbed, successEmbed, errorEmbed, warnEmbed } = require('../../utils/embeds');
const { UZUN_KELIMELER } = require('../../content/kelimeler');
const channelGames = require('../../utils/channelGames');

const SURE_MS = 3 * 60_000;
const ODUL = 100;
const TURKCE_HARF = /^[a-zçğıöşü]+$/;

const ASAMALAR = [
  '  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========',
];
const MAX_YANLIS = ASAMALAR.length - 1;

function buyuk(str) {
  return str.toLocaleUpperCase('tr-TR');
}

function durum(harfler, bilinen, yanlislar) {
  const kelime = harfler.map((h) => (bilinen.has(h) ? buyuk(h) : '\\_')).join(' ');
  const yanlisMetni = yanlislar.length ? yanlislar.map(buyuk).join(', ') : '—';
  return `\`\`\`\n${ASAMALAR[yanlislar.length]}\n\`\`\`\n**${kelime}**\n\nYanlış harfler: ${yanlisMetni}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adamasmaca')
    .setDescription('Kanaldaki herkesin katılabildiği adam asmaca oyunu başlat.'),
  async execute(interaction) {
    const { channel, guildId } = interaction;

    if (!channelGames.tryLock(channel.id)) {
      await interaction.reply({ embeds: [warnEmbed('Bu kanalda zaten bir kelime oyunu dönüyor, önce o bitsin.')] });
      return;
    }

    const kelime = UZUN_KELIMELER[Math.floor(Math.random() * UZUN_KELIMELER.length)];
    const harfler = Array.from(kelime);
    const bilinen = new Set();
    const yanlislar = [];

    await interaction.reply({
      embeds: [
        infoEmbed(`Herkes katılabilir! Kanala tek bir harf ya da kelimenin tamamını yaz.\n\n${durum(harfler, bilinen, yanlislar)}`).setTitle(
          '🪢 Adam Asmaca'
        ),
      ],
    });

    const collector = channel.createMessageCollector({
      filter: (m) => {
        if (m.author.bot || m.content.startsWith(config.prefix)) return false;
        const metin = m.content.trim().toLocaleLowerCase('tr-TR');
        if (!TURKCE_HARF.test(metin)) return false;
        const uzunluk = Array.from(metin).length;
        return uzunluk === 1 || uzunluk === harfler.length;
      },
      time: SURE_MS,
    });

    let kazanan = null;

    collector.on('collect', async (m) => {
      const metin = m.content.trim().toLocaleLowerCase('tr-TR');

      if (Array.from(metin).length > 1) {
        if (metin === kelime) {
          harfler.forEach((h) => bilinen.add(h));
          kazanan = m.author;
          collector.stop('kazanildi');
        } else {
          yanlislar.push(metin);
          if (yanlislar.length >= MAX_YANLIS) collector.stop('asildi');
          else await channel.send({ embeds: [errorEmbed(`❌ **${buyuk(metin)}** değil.\n\n${durum(harfler, bilinen, yanlislar)}`)] }).catch(() => {});
        }
        return;
      }

      if (bilinen.has(metin) || yanlislar.includes(metin)) {
        await m.react('🔁').catch(() => {});
        return;
      }

      if (harfler.includes(metin)) {
        bilinen.add(metin);
        if (harfler.every((h) => bilinen.has(h))) {
          kazanan = m.author;
          collector.stop('kazanildi');
          return;
        }
        await channel.send({ embeds: [infoEmbed(durum(harfler, bilinen, yanlislar))] }).catch(() => {});
        return;
      }

      yanlislar.push(metin);
      if (yanlislar.length >= MAX_YANLIS) {
        collector.stop('asildi');
        return;
      }
      await channel.send({ embeds: [errorEmbed(durum(harfler, bilinen, yanlislar))] }).catch(() => {});
    });

    collector.on('end', async (_collected, reason) => {
      channelGames.unlock(channel.id);
      const cevap = buyuk(kelime);

      if (reason === 'kazanildi' && kazanan) {
        const bakiye = economyRepo.addBalance(guildId, kazanan.id, ODUL);
        await channel
          .send({
            embeds: [successEmbed(`🎉 <@${kazanan.id}> bildi! Kelime **${cevap}** idi. **${ODUL}** TL kazandı. Bakiye: **${bakiye}** TL.`)],
          })
          .catch(() => {});
        return;
      }

      const mesaj =
        reason === 'asildi'
          ? `\`\`\`\n${ASAMALAR[MAX_YANLIS]}\n\`\`\`\n💀 Adam asıldı. Kelime **${cevap}** idi.`
          : `⌛ Süre doldu. Kelime **${cevap}** idi.`;
      await channel.send({ embeds: [errorEmbed(mesaj)] }).catch(() => {});
    });
  },
};
