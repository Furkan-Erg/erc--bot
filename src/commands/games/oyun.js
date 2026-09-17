const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { FILTRE_ADLARI, filtreCoz } = require('../../content/steamOyunlar');
const { rastgeleOyun } = require('../../utils/steamStore');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

const SURE_MS = 180_000;
const EN_UZUN_ACIKLAMA = 300;

const ID = {
  baska: 'oyun:baska',
};

function sayi(deger) {
  return Number(deger).toLocaleString('tr-TR');
}

// Steam "$1.59 USD" derken indirimsiz fiyatı "$3.99" diye veriyor; para birimi eki
// ikisinde de görünmesin diye kırpılıyor.
function temizFiyat(metin) {
  return String(metin || '').replace(/\s*[A-Z]{3}$/, '').trim();
}

function fiyatMetni(oyun) {
  if (oyun.ucretsiz) return '🆓 Ücretsiz';
  if (!oyun.fiyat) return 'Fiyat bilgisi yok';
  if (oyun.fiyat.indirim > 0) {
    return `~~${temizFiyat(oyun.fiyat.once)}~~ **${temizFiyat(oyun.fiyat.simdi)}**  ·  **-%${oyun.fiyat.indirim}**`;
  }
  return `**${temizFiyat(oyun.fiyat.simdi)}**`;
}

function kisalt(metin) {
  if (metin.length <= EN_UZUN_ACIKLAMA) return metin;
  return `${metin.slice(0, EN_UZUN_ACIKLAMA).trimEnd()}…`;
}

function oyunEmbed(oyun, filtre) {
  const embed = infoEmbed(kisalt(oyun.aciklama) || '_Açıklama yok._')
    .setTitle(`🎮 ${oyun.ad}`)
    .setURL(oyun.url)
    .addFields({ name: '💵 Fiyat', value: fiyatMetni(oyun), inline: true });

  if (oyun.puan) {
    embed.addFields({ name: '👍 Değerlendirme', value: `%${oyun.puan.yuzde} olumlu · ${sayi(oyun.puan.oy)} oy`, inline: true });
  }
  if (oyun.turler.length > 0) {
    embed.addFields({ name: '🏷️ Tür', value: oyun.turler.slice(0, 3).join(', '), inline: true });
  }
  if (oyun.cikis) {
    embed.addFields({ name: '📅 Çıkış', value: oyun.cikis, inline: true });
  }
  if (oyun.gelistirici) {
    embed.addFields({ name: '🛠️ Yapımcı', value: oyun.gelistirici, inline: true });
  }
  if (oyun.ccu) {
    embed.addFields({ name: '👥 Şu an oynayan', value: sayi(oyun.ccu), inline: true });
  }
  if (oyun.gorsel) embed.setImage(oyun.gorsel);

  return embed.setFooter({ text: filtre ? `Steam · ${filtre.ad} oyunlar arasından` : 'Steam · rastgele öneri' });
}

function bilesenler(oyun, kapali) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(ID.baska)
        .setLabel('Başka Öner')
        .setEmoji('🎲')
        .setStyle(ButtonStyle.Success)
        .setDisabled(kapali),
      new ButtonBuilder().setLabel("Steam'de Aç").setEmoji('🛒').setStyle(ButtonStyle.Link).setURL(oyun.url)
    ),
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('oyun')
    .setDescription("Steam'den rastgele bir oyun önerir.")
    .addStringOption((opt) => opt.setName('filtre').setDescription('indirimde, ücretsiz ya da ucuz (opsiyonel)').setRequired(false)),
  async execute(interaction) {
    const { user } = interaction;

    const filtreGirdisi = interaction.options.getString('filtre');
    const filtre = filtreCoz(filtreGirdisi);
    if (filtreGirdisi && !filtre) {
      await interaction.reply({
        embeds: [errorEmbed(`**${filtreGirdisi}** diye bir filtre yok.\n\n**Kullanabileceklerin:** ${FILTRE_ADLARI.join(', ')}`)],
      });
      return;
    }

    await interaction.deferReply();
    let sonOyun = null;

    async function oner() {
      const oyun = await rastgeleOyun(filtre).catch((err) => {
        logger.error('Steam oyun önerisi alınamadı', err);
        return null;
      });

      if (!oyun) {
        await interaction.editReply({
          embeds: [
            errorEmbed(
              filtre
                ? `${filtre.emoji} **${filtre.ad}** bir oyun bulamadım, birazdan tekrar dene.`
                : 'Steam şu an cevap vermedi, birazdan tekrar dene.'
            ),
          ],
          components: [],
        });
        return false;
      }

      sonOyun = oyun;
      await interaction.editReply({ embeds: [oyunEmbed(oyun, filtre)], components: bilesenler(oyun, false) });
      return true;
    }

    if (!(await oner())) return;

    const mesaj = await interaction.fetchReply();
    const collector = mesaj.createMessageComponentCollector({ time: SURE_MS });

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) {
        await i.reply({ content: 'Bu öneriyi sen istemedin, kendi `!oyun` komutunu çalıştır.', ephemeral: true }).catch(() => {});
        return;
      }

      try {
        await i.deferUpdate().catch(() => {});
        const oldu = await oner();
        if (!oldu) collector.stop();
      } catch (err) {
        logger.error('Steam oyun önerisi etkileşimi işlenemedi', err);
        await i.followUp({ content: 'Bir şeyler ters gitti.', ephemeral: true }).catch(() => {});
      }
    });

    collector.on('end', async () => {
      // Link butonu açık kalsın, sadece "Başka Öner" kapansın.
      if (!sonOyun) return;
      await interaction.editReply({ components: bilesenler(sonOyun, true) }).catch(() => {});
    });
  },
};
