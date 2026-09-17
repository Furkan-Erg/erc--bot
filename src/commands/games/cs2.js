const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} = require('discord.js');
const { CS2_HARITALARI, AKTIF_HAVUZ, haritaBul } = require('../../content/cs2Maps');
const { haritaIzgarasi } = require('../../utils/cs2MapImage');
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

const DOSYA_ADI = 'cs2-haritalar.png';
const SURE_MS = 180_000;
const RULET_KARE_SAYISI = 6;
const RULET_BEKLEME_MS = 650;

const ID = {
  secim: 'cs2:secim',
  rolle: 'cs2:rolle',
  aktif: 'cs2:aktif',
  hepsi: 'cs2:hepsi',
  iptal: 'cs2:iptal',
};

function bekle(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rastgele(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

function haritaListesi(keyler) {
  return keyler.map((key) => haritaBul(key)).filter(Boolean);
}

function secimEmbed(secili) {
  const isimler = haritaListesi(secili).map((h) => `\`${h.ad}\``).join(' ');
  return infoEmbed(
    `Aşağıdaki menüden oynamak istediğin haritaları seç, sonra **Rolle**'ye bas — içlerinden birini rastgele seçeyim.\n\n` +
      `**Havuzdaki haritalar (${secili.length}):**\n${isimler || '_Hiç harita seçili değil._'}`
  )
    .setTitle('🔫 CS2 Harita Ruleti')
    .setImage(`attachment://${DOSYA_ADI}`)
    .setFooter({ text: 'Yeşil çerçeveli haritalar havuzda.' });
}

function bilesenler(secili, kapali = false) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(ID.secim)
    .setPlaceholder('Haritaları seç…')
    .setMinValues(1)
    .setMaxValues(CS2_HARITALARI.length)
    .setDisabled(kapali)
    .addOptions(
      CS2_HARITALARI.map((harita, index) => ({
        label: `${index + 1}. ${harita.ad}`,
        value: harita.key,
        description: harita.havuz === 'aktif' ? 'Aktif havuz' : 'Rezerv',
        default: secili.includes(harita.key),
      }))
    );

  const butonlar = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(ID.rolle).setLabel('Rolle').setEmoji('🎲').setStyle(ButtonStyle.Success).setDisabled(kapali),
    new ButtonBuilder().setCustomId(ID.aktif).setLabel('Aktif Havuz').setStyle(ButtonStyle.Secondary).setDisabled(kapali),
    new ButtonBuilder().setCustomId(ID.hepsi).setLabel('Hepsi').setStyle(ButtonStyle.Secondary).setDisabled(kapali),
    new ButtonBuilder().setCustomId(ID.iptal).setLabel('İptal').setStyle(ButtonStyle.Danger).setDisabled(kapali)
  );

  return [new ActionRowBuilder().addComponents(menu), butonlar];
}

async function izgaraEki(secili) {
  const buffer = await haritaIzgarasi(CS2_HARITALARI, secili);
  return new AttachmentBuilder(buffer, { name: DOSYA_ADI });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cs2')
    .setDescription('CS2 haritalarını gör, havuzunu seç, içinden rastgele harita çektir.'),
  async execute(interaction) {
    const { user } = interaction;
    await interaction.deferReply();

    let secili = [...AKTIF_HAVUZ];
    let mesaj;
    try {
      mesaj = await interaction.editReply({
        embeds: [secimEmbed(secili)],
        files: [await izgaraEki(secili)],
        components: bilesenler(secili),
      });
    } catch (err) {
      logger.error('CS2 harita ızgarası oluşturulamadı', err);
      await interaction.editReply({ embeds: [errorEmbed('Harita görsellerini hazırlayamadım, birazdan tekrar dene.')] });
      return;
    }

    const collector = mesaj.createMessageComponentCollector({ time: SURE_MS });
    let bitti = false;

    async function tabloyuGuncelle() {
      await interaction.editReply({
        embeds: [secimEmbed(secili)],
        files: [await izgaraEki(secili)],
        attachments: [],
        components: bilesenler(secili),
      });
    }

    async function rolle() {
      const havuz = haritaListesi(secili);
      const kazanan = rastgele(havuz);

      for (let i = 0; i < RULET_KARE_SAYISI; i++) {
        const gosterilen = i === RULET_KARE_SAYISI - 1 ? kazanan : rastgele(havuz);
        await interaction
          .editReply({
            embeds: [
              infoEmbed(`🎲 Çeviriyorum…\n\n# ${gosterilen.ad}`)
                .setTitle('🔫 CS2 Harita Ruleti')
                .setImage(`attachment://${DOSYA_ADI}`),
            ],
            components: bilesenler(secili, true),
          })
          .catch(() => {});
        await bekle(RULET_BEKLEME_MS);
      }

      await interaction.editReply({
        embeds: [
          successEmbed(
            `# ${kazanan.ad}\n\n${user} için **${havuz.length}** harita arasından çekildi.\n` +
              `Havuz: ${havuz.map((h) => h.ad).join(', ')}`
          )
            .setTitle('🎯 Harita belli oldu!')
            .setImage(kazanan.gorsel)
            .setFooter({ text: kazanan.key }),
        ],
        files: [],
        attachments: [],
        components: [],
      });
    }

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) {
        await i.reply({ content: 'Bu ruleti sen başlatmadın, kendi `!cs2` komutunu çalıştır.', ephemeral: true }).catch(() => {});
        return;
      }

      try {
        if (i.customId === ID.iptal) {
          bitti = true;
          await i.deferUpdate().catch(() => {});
          await interaction.editReply({
            embeds: [infoEmbed('Rulet iptal edildi.').setTitle('🔫 CS2 Harita Ruleti')],
            files: [],
            attachments: [],
            components: [],
          });
          collector.stop();
          return;
        }

        if (i.customId === ID.rolle) {
          bitti = true;
          await i.deferUpdate().catch(() => {});
          await rolle();
          collector.stop();
          return;
        }

        await i.deferUpdate().catch(() => {});
        if (i.customId === ID.secim) secili = i.values;
        else if (i.customId === ID.aktif) secili = [...AKTIF_HAVUZ];
        else if (i.customId === ID.hepsi) secili = CS2_HARITALARI.map((h) => h.key);
        await tabloyuGuncelle();
      } catch (err) {
        logger.error('CS2 harita ruleti etkileşimi işlenemedi', err);
        await i.followUp({ content: 'Bir şeyler ters gitti.', ephemeral: true }).catch(() => {});
      }
    });

    collector.on('end', async () => {
      if (bitti) return;
      await interaction
        .editReply({ embeds: [secimEmbed(secili).setFooter({ text: 'Süre doldu.' })], components: bilesenler(secili, true) })
        .catch(() => {});
    });
  },
};
