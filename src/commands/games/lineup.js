const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { HARITALAR, TIPLER, HARITA_ADLARI, TIP_ADLARI, haritaCoz, tipCoz } = require('../../content/cs2Lineups');
const { lineupAra } = require('../../utils/cs2LineupSearch');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

const SURE_MS = 180_000;
const VARSAYILAN_TIP = 'smoke';

const ID = {
  baska: 'lineup:baska',
  bitir: 'lineup:bitir',
};

function karistir(liste) {
  const kopya = [...liste];
  for (let i = kopya.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopya[i], kopya[j]] = [kopya[j], kopya[i]];
  }
  return kopya;
}

function sureMetni(saniye) {
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  return dk > 0 ? `${dk}:${String(sn).padStart(2, '0')}` : `${sn} sn`;
}

function baslikMetni(harita, tip) {
  return `${tip.emoji} ${harita.aranan} — ${tip.ad} lineup`;
}

function bilesenler(kapali, tekKlip) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(ID.baska)
        .setLabel('Başka Lineup')
        .setEmoji('🔁')
        .setStyle(ButtonStyle.Success)
        .setDisabled(kapali || tekKlip),
      new ButtonBuilder().setCustomId(ID.bitir).setLabel('Bitir').setStyle(ButtonStyle.Secondary).setDisabled(kapali)
    ),
  ];
}

// Klip embed'de değil düz metinde gösteriliyor: oynatılabilir YouTube kutusunu
// Discord'un kendi link önizleyicisi üretiyor ve bunun için URL'nin mesaj
// içeriğinde çıplak durması gerekiyor (embed içindeki köprü metni tetiklemiyor).
function klipMetni(haritaKey, tip, klip, sira, toplam) {
  const harita = HARITALAR[haritaKey];
  return (
    `**${baslikMetni(harita, tip)}**  ·  ${sira}/${toplam}\n` +
    `📺 ${klip.kanal}  ·  ⏱️ ${sureMetni(klip.saniye)}  ·  ${klip.baslik}\n` +
    klip.url
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lineup')
    .setDescription('CS2 haritası için smoke/flash/molotov/HE lineup klibi bulur.')
    .addStringOption((opt) => opt.setName('harita').setDescription('Örn. mirage, nuke, dust2').setRequired(true))
    .addStringOption((opt) => opt.setName('tip').setDescription('smoke, flash, molotov, he (varsayılan: smoke)').setRequired(false)),
  async execute(interaction) {
    const { user } = interaction;

    const haritaKey = haritaCoz(interaction.options.getString('harita', true));
    if (!haritaKey) {
      await interaction.reply({
        embeds: [errorEmbed(`Bu haritayı tanımıyorum.\n\n**Desteklenenler:** ${HARITA_ADLARI.join(', ')}`)],
      });
      return;
    }

    const tipGirdisi = interaction.options.getString('tip');
    const tipKey = tipGirdisi ? tipCoz(tipGirdisi) : VARSAYILAN_TIP;
    if (!tipKey) {
      await interaction.reply({
        embeds: [errorEmbed(`Bu utility tipini tanımıyorum.\n\n**Desteklenenler:** ${TIP_ADLARI.join(', ')}`)],
      });
      return;
    }

    const harita = HARITALAR[haritaKey];
    const tip = TIPLER[tipKey];

    await interaction.deferReply();
    await interaction.editReply({
      embeds: [infoEmbed(`🔎 **${harita.aranan}** için ${tip.ad.toLocaleLowerCase('tr-TR')} lineup'ları aranıyor…`).setTitle(baslikMetni(harita, tip))],
    });

    const bulunanlar = await lineupAra(haritaKey, tipKey).catch((err) => {
      logger.error('CS2 lineup araması başarısız oldu', err);
      return [];
    });

    if (bulunanlar.length === 0) {
      await interaction.editReply({
        embeds: [errorEmbed(`**${harita.aranan}** için ${tip.ad.toLocaleLowerCase('tr-TR')} lineup klibi bulamadım, başka bir kombinasyon dene.`)],
      });
      return;
    }

    const sira = karistir(bulunanlar);
    const tekKlip = sira.length === 1;
    let index = 0;
    let ilkGosterim = true;

    async function klibiGoster() {
      const yuk = {
        content: klipMetni(haritaKey, tip, sira[index], index + 1, sira.length),
        components: bilesenler(false, tekKlip),
      };
      // Arama embed'i sadece ilk seferde temizleniyor; sonraki düzenlemelerde embeds
      // alanı hiç gönderilmiyor ki Discord yeni linkin önizlemesini kendi üretebilsin.
      if (ilkGosterim) {
        yuk.embeds = [];
        ilkGosterim = false;
      }

      await interaction.editReply(yuk);
    }

    await klibiGoster();

    const mesaj = await interaction.fetchReply();
    const collector = mesaj.createMessageComponentCollector({ time: SURE_MS });
    let bitti = false;

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) {
        await i.reply({ content: 'Bu aramayı sen başlatmadın, kendi `!lineup` komutunu çalıştır.', ephemeral: true }).catch(() => {});
        return;
      }

      try {
        await i.deferUpdate().catch(() => {});

        if (i.customId === ID.bitir) {
          bitti = true;
          await interaction.editReply({ components: bilesenler(true, tekKlip) }).catch(() => {});
          collector.stop();
          return;
        }

        index = (index + 1) % sira.length;
        await klibiGoster();
      } catch (err) {
        logger.error('CS2 lineup etkileşimi işlenemedi', err);
        await i.followUp({ content: 'Bir şeyler ters gitti.', ephemeral: true }).catch(() => {});
      }
    });

    collector.on('end', async () => {
      if (bitti) return;
      await interaction.editReply({ components: bilesenler(true, tekKlip) }).catch(() => {});
    });
  },
};
