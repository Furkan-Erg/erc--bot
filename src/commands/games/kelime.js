const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { infoEmbed, successEmbed, errorEmbed, warnEmbed } = require('../../utils/embeds');
const { BES_HARFLI } = require('../../content/kelimeler');
const channelGames = require('../../utils/channelGames');

const MAX_DENEME = 6;
const SURE_MS = 3 * 60_000;
const ODUL_CARPANI = 30;
const TURKCE_HARF = /^[a-zçğıöşü]+$/;

function buyuk(str) {
  return str.toLocaleUpperCase('tr-TR');
}

// Tekrarlı harfleri doğru saymak için önce yeşiller düşülür, kalan harflerden sarılar dağıtılır.
function degerlendir(tahmin, hedef) {
  const sonuc = Array(hedef.length).fill('⬛');
  const kalan = {};

  for (let i = 0; i < hedef.length; i++) {
    if (tahmin[i] === hedef[i]) {
      sonuc[i] = '🟩';
    } else {
      kalan[hedef[i]] = (kalan[hedef[i]] || 0) + 1;
    }
  }
  for (let i = 0; i < hedef.length; i++) {
    if (sonuc[i] === '🟩') continue;
    if (kalan[tahmin[i]] > 0) {
      sonuc[i] = '🟨';
      kalan[tahmin[i]] -= 1;
    }
  }
  return sonuc.join('');
}

function tahta(satirlar) {
  const bos = Array(MAX_DENEME - satirlar.length).fill('⬜⬜⬜⬜⬜');
  return [...satirlar, ...bos].join('\n');
}

module.exports = {
  data: new SlashCommandBuilder().setName('kelime').setDescription('Türkçe Wordle: 5 harfli kelimeyi 6 denemede bul.'),
  async execute(interaction) {
    const { channel, user, guildId } = interaction;

    if (!channelGames.tryLock(channel.id)) {
      await interaction.reply({ embeds: [warnEmbed('Bu kanalda zaten bir kelime oyunu dönüyor, önce o bitsin.')] });
      return;
    }

    const hedef = Array.from(BES_HARFLI[Math.floor(Math.random() * BES_HARFLI.length)]);
    const satirlar = [];

    await interaction.reply({
      embeds: [
        infoEmbed(
          `5 harfli bir kelime tuttum, **${MAX_DENEME}** hakkın var. Tahminini kanala yaz.\n` +
            '🟩 doğru yer · 🟨 kelimede var ama yeri yanlış · ⬛ yok\n' +
            'Vazgeçmek için `pes` yaz.\n\n' +
            tahta(satirlar)
        ).setTitle(`🔤 Kelime — ${user.username}`),
      ],
    });

    const collector = channel.createMessageCollector({
      filter: (m) => m.author.id === user.id && !/\s/.test(m.content.trim()),
      time: SURE_MS,
    });

    collector.on('collect', async (m) => {
      const metin = m.content.trim().toLocaleLowerCase('tr-TR');

      if (metin === 'pes') {
        collector.stop('pes');
        return;
      }

      const tahmin = Array.from(metin);
      if (tahmin.length !== 5 || !TURKCE_HARF.test(metin)) {
        await m.reply('5 harfli, sadece harflerden oluşan bir kelime yaz.').catch(() => {});
        return;
      }

      satirlar.push(`${degerlendir(tahmin, hedef)}  \`${buyuk(metin)}\``);

      if (metin === hedef.join('')) {
        collector.stop('kazandi');
        return;
      }
      if (satirlar.length >= MAX_DENEME) {
        collector.stop('bitti');
        return;
      }

      await channel
        .send({ embeds: [infoEmbed(tahta(satirlar)).setFooter({ text: `Kalan hak: ${MAX_DENEME - satirlar.length}` })] })
        .catch(() => {});
    });

    collector.on('end', async (_collected, reason) => {
      channelGames.unlock(channel.id);
      const cevap = buyuk(hedef.join(''));

      if (reason === 'kazandi') {
        const odul = (MAX_DENEME + 1 - satirlar.length) * ODUL_CARPANI;
        const bakiye = economyRepo.addBalance(guildId, user.id, odul);
        await channel
          .send({
            embeds: [
              successEmbed(`${tahta(satirlar)}\n\n🎉 **${satirlar.length}** denemede bildin! **${odul}** TL kazandın. Bakiye: **${bakiye}** TL.`),
            ],
          })
          .catch(() => {});
        return;
      }

      const mesaj =
        reason === 'pes'
          ? `🏳️ Pes ettin. Kelime **${cevap}** idi.`
          : reason === 'bitti'
            ? `${tahta(satirlar)}\n\n💀 Hakların bitti. Kelime **${cevap}** idi.`
            : `⌛ Süre doldu. Kelime **${cevap}** idi.`;

      await channel.send({ embeds: [errorEmbed(mesaj)] }).catch(() => {});
    });
  },
};
