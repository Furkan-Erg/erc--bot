const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const inventoryRepo = require('../../database/repositories/inventoryRepo');
const { warnEmbed } = require('../../utils/embeds');
const inflation = require('../../utils/inflation');

function yuzde(oran) {
  return `%${(oran * 100).toFixed(1)}`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('enflasyon').setDescription('Enflasyonun cebine ne yapacağını göster.'),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const bakiye = economyRepo.getBalance(guildId, user.id);
    const kasaVar = inventoryRepo.getQuantity(guildId, user.id, 'kasa') > 0;
    const sonOran = inflation.lastRate();
    const sonraki = Math.floor(inflation.nextRunAt() / 1000);
    const maxKayip = inflation.estimateMaxLoss(guildId, user.id, bakiye);

    const satirlar = [
      `Her **6 saatte** bir, **${inflation.THRESHOLD}** TL üstündeki bakiyeler ${yuzde(inflation.MIN_RATE)} ile ${yuzde(inflation.MAX_RATE)} arası erir.`,
      `İlk ${inflation.THRESHOLD} TL'ye dokunulmaz, merak etme.`,
      '',
      `📉 Son enflasyon oranı: **${sonOran ? yuzde(sonOran) : 'henüz yok'}**`,
      `⏰ Bir sonraki zam: <t:${sonraki}:R>`,
      `💰 Senin bakiyen: **${bakiye}** TL`,
      `🔥 En kötü senaryoda kaybın: **${maxKayip}** TL`,
      kasaVar
        ? '🔐 Çelik kasan var, zararın yarıya iniyor.'
        : '🔐 Kasan yok. Dükkândan **Çelik Kasa** alırsan zararın yarıya iner.',
      '',
      '_Parayı yastık altında tutma, harca ya da kasaya koy._',
    ];

    await interaction.reply({ embeds: [warnEmbed(satirlar.join('\n')).setTitle('📈 Enflasyon Raporu')] });
  },
};
