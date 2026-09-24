const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../utils/logger');
const musicManager = require('../music/musicManager');
const panel = require('../music/panel');

const SEEK_MODAL_ID = `${panel.PREFIX}seekmodal`;
const SEEK_INPUT_ID = 'zaman';

// Panelin butonlarına sadece botla aynı sesli kanaldakiler basabilsin.
function ayniKanaldaMi(interaction) {
  const botKanali = interaction.guild?.members?.me?.voice?.channel;
  const uyeKanali = interaction.member?.voice?.channel;
  if (!botKanali) return true;
  return Boolean(uyeKanali) && uyeKanali.id === botKanali.id;
}

async function uyar(interaction, mesaj) {
  await interaction.reply({ content: mesaj, ephemeral: true }).catch(() => {});
}

// "90", "1:30" ya da "1:02:03" gibi girdileri saniyeye çevirir; geçersizse null döner.
function saniyeyeCevir(metin) {
  const parcalar = metin.trim().split(':').map((p) => p.trim());
  if (parcalar.length > 3 || parcalar.some((p) => p === '' || Number.isNaN(Number(p)))) return null;

  const sayilar = parcalar.map(Number);
  if (sayilar.some((n) => n < 0)) return null;

  return sayilar.reduce((toplam, n) => toplam * 60 + n, 0);
}

async function seekModaliAc(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(SEEK_MODAL_ID)
    .setTitle('Saniyeye Git')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(SEEK_INPUT_ID)
          .setLabel('Zaman (sn ya da dk:sn, örn: 90 veya 1:30)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('1:30')
          .setRequired(true)
      )
    );
  await interaction.showModal(modal);
}

async function seekModaliIsle(interaction) {
  const { guildId } = interaction;
  const state = musicManager.getState(guildId);

  if (!state || !state.current) {
    await uyar(interaction, 'Bu panel eskimiş, şu an çalan bir şey yok.');
    return;
  }
  if (!ayniKanaldaMi(interaction)) {
    await uyar(interaction, 'Kumandayı kullanmak için botla aynı sesli kanalda olman lazım.');
    return;
  }

  const girdi = interaction.fields.getTextInputValue(SEEK_INPUT_ID);
  const saniye = saniyeyeCevir(girdi);
  if (saniye === null) {
    await uyar(interaction, 'Zamanı anlayamadım, "90" ya da "1:30" gibi yaz.');
    return;
  }

  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  try {
    const basarili = await musicManager.seek(guildId, saniye);
    const cevap = basarili ? `⏩ **${state.current.title}** için ${girdi} saniyesine atlandı.` : 'Saniyeye gidilemedi.';
    await interaction.editReply({ content: cevap }).catch(() => {});
  } catch (err) {
    logger.error('Seek modalı işlenemedi', err);
    await interaction.editReply({ content: 'Bir şeyler ters gitti.' }).catch(() => {});
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isModalSubmit() && interaction.customId === SEEK_MODAL_ID) {
      await seekModaliIsle(interaction);
      return;
    }

    if (!interaction.isButton() || !interaction.customId.startsWith(panel.PREFIX)) return;

    const aksiyon = interaction.customId.slice(panel.PREFIX.length);
    const { guildId } = interaction;
    const state = musicManager.getState(guildId);

    if (!state || !state.current) {
      await uyar(interaction, 'Bu panel eskimiş, şu an çalan bir şey yok.');
      return;
    }
    if (!ayniKanaldaMi(interaction)) {
      await uyar(interaction, 'Kumandayı kullanmak için botla aynı sesli kanalda olman lazım.');
      return;
    }

    try {
      switch (aksiyon) {
        case 'playpause': {
          // Paneli musicManager kendisi güncelliyor; burada sadece tıklamayı onaylıyoruz.
          await interaction.deferUpdate().catch(() => {});
          if (panel.duraklatilmis(state)) musicManager.resume(guildId);
          else musicManager.pause(guildId);
          return;
        }
        case 'skip': {
          const atlanan = state.current.title;
          // Atlanınca yeni şarkı yeni panel gönderiyor, bu yüzden mesajı güncellemeye çalışmıyoruz.
          await interaction.deferUpdate().catch(() => {});
          musicManager.skip(guildId);
          await interaction.channel.send(`⏭️ ${interaction.user} atladı: **${atlanan}**`).catch(() => {});
          return;
        }
        case 'stop': {
          await interaction.deferUpdate().catch(() => {});
          musicManager.stop(guildId);
          await interaction.channel.send(`⏹️ ${interaction.user} durdurdu, kanaldan çıktım.`).catch(() => {});
          return;
        }
        case 'loop': {
          const mod = musicManager.setLoop(guildId);
          await interaction.reply({ content: `🔁 ${panel.LOOP_ETIKETLERI[mod]}`, ephemeral: true }).catch(() => {});
          return;
        }
        case 'shuffle': {
          const kalan = musicManager.shuffle(guildId);
          await interaction.reply({ content: `🔀 Kuyruk karıştırıldı (${kalan} şarkı).`, ephemeral: true }).catch(() => {});
          return;
        }
        case 'seek': {
          await seekModaliAc(interaction);
          return;
        }
        default:
          await uyar(interaction, 'Bu butonu tanımıyorum.');
      }
    } catch (err) {
      logger.error(`Müzik paneli butonu işlenemedi: ${aksiyon}`, err);
      await uyar(interaction, 'Bir şeyler ters gitti.');
    }
  },
};
