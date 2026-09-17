const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, warnEmbed, errorEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

const MOD_ETIKETLERI = {
  kapali: '➡️ Döngü kapalı',
  sarki: '🔂 Şarkı tekrarı açık',
  kuyruk: '🔁 Kuyruk tekrarı açık',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Döngü modunu değiştir: kapali, sarki, kuyruk (boş bırakırsan sıradakine geçer).')
    .addStringOption((opt) => opt.setName('mod').setDescription('kapali | sarki | kuyruk').setRequired(false)),
  async execute(interaction) {
    const state = musicManager.getState(interaction.guildId);
    if (!state) {
      await interaction.reply({ embeds: [warnEmbed('Şu an çalan bir şey yok ki döngüye sokayım.')] });
      return;
    }

    const girdi = interaction.options.getString('mod')?.toLocaleLowerCase('tr-TR').replace('ı', 'i').replace('ş', 's');
    if (girdi && !musicManager.LOOP_MODLARI.includes(girdi)) {
      await interaction.reply({ embeds: [errorEmbed('Geçerli modlar: `kapali`, `sarki`, `kuyruk`.')] });
      return;
    }

    const mod = musicManager.setLoop(interaction.guildId, girdi);
    await interaction.reply({ embeds: [infoEmbed(MOD_ETIKETLERI[mod])] });
  },
};
