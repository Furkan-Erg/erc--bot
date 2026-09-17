const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { HARITALAR, TIPLER, HARITA_ADLARI, TIP_ADLARI, haritaCoz, tipCoz } = require('../../content/cs2Lineups');
const { haritaBul } = require('../../content/cs2Maps');
const { lineupAra } = require('../../utils/cs2LineupSearch');
const { klipIndir } = require('../../utils/cs2Clip');
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

function klipEmbed(haritaKey, tip, klip, sira, toplam) {
  const harita = HARITALAR[haritaKey];
  const embed = infoEmbed(
    `**[${klip.baslik}](${klip.url})**\n` +
      `📺 ${klip.kanal}  •  ⏱️ ${sureMetni(klip.saniye)}`
  )
    .setTitle(baslikMetni(harita, tip))
    .setFooter({ text: `${sira}/${toplam} klip  •  "Başka Lineup" ile sıradakine geç` });

  const haritaGorseli = haritaBul(haritaKey);
  if (haritaGorseli) embed.setThumbnail(haritaGorseli.gorsel);
  return embed;
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
    // İndirme sürerken gelen ikinci tıklama iki paralel düzenleme başlatmasın.
    let mesgul = false;

    async function klibiGoster() {
      const klip = sira[index];
      const embed = klipEmbed(haritaKey, tip, klip, index + 1, sira.length);
      mesgul = true;

      try {
        await interaction
          .editReply({
            embeds: [infoEmbed(`⏬ Klip hazırlanıyor…\n\n**[${klip.baslik}](${klip.url})**`).setTitle(baslikMetni(harita, tip))],
            files: [],
            attachments: [],
            components: bilesenler(true, tekKlip),
          })
          .catch(() => {});

        // Klip inemezse (yt-dlp hatası, boyut sınırı) embed'deki YouTube linkine düşüyoruz.
        const dosya = await klipIndir(klip.videoId);
        const yuk = { embeds: [embed], files: [], attachments: [], components: bilesenler(false, tekKlip) };
        if (dosya) yuk.files = [new AttachmentBuilder(dosya, { name: `${klip.videoId}.mp4` })];
        else embed.setImage(klip.kucukResim);

        await interaction.editReply(yuk);
      } finally {
        mesgul = false;
      }
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

        if (mesgul) return;
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
