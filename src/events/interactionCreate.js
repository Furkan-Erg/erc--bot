const logger = require('../utils/logger');
const musicManager = require('../music/musicManager');
const panel = require('../music/panel');

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

// +/- adım butonlarıyla saniyeyi ileri/geri kaydırır; hedef negatife düşerse 0'a sabitlenir.
async function seekAdimUygula(interaction, state, delta) {
  const guildId = interaction.guildId;
  const mevcut = panel.elapsedSaniye(state);
  const hedefSaniye = Math.max(0, mevcut + delta);

  await interaction.deferUpdate().catch(() => {});
  try {
    const basarili = await musicManager.seek(guildId, hedefSaniye);
    if (!basarili) {
      await interaction.followUp({ content: 'Saniyeye gidilemedi.', ephemeral: true }).catch(() => {});
    }
  } catch (err) {
    logger.error('Seek adımı işlenemedi', err);
    await interaction.followUp({ content: 'Bir şeyler ters gitti.', ephemeral: true }).catch(() => {});
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
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

    if (aksiyon.startsWith('seek:')) {
      const delta = Number(aksiyon.slice('seek:'.length));
      await seekAdimUygula(interaction, state, delta);
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
        default:
          await uyar(interaction, 'Bu butonu tanımıyorum.');
      }
    } catch (err) {
      logger.error(`Müzik paneli butonu işlenemedi: ${aksiyon}`, err);
      await uyar(interaction, 'Bir şeyler ters gitti.');
    }
  },
};
