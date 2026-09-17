const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const inventoryRepo = require('../../database/repositories/inventoryRepo');
const cooldownRepo = require('../../database/repositories/cooldownRepo');
const { successEmbed, errorEmbed, warnEmbed } = require('../../utils/embeds');
const { getRemainingCooldown, formatDuration } = require('../../utils/cooldowns');

const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const BASARI_SANSI = 0.4;
const MIN_HEDEF_BAKIYE = 100;
const MIN_SOYGUNCU_BAKIYE = 200;
const MAX_CALINTI = 5000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soygun')
    .setDescription('Birinin cebine el at. Yakalanırsan ceza ödersin.')
    .addUserOption((opt) => opt.setName('user').setDescription('Soyulacak kişi').setRequired(true)),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const target = interaction.options.getUser('user', true);

    if (target.id === user.id) {
      await interaction.reply({ embeds: [errorEmbed('Kendi cebine el atıyorsun, ciddi misin?')] });
      return;
    }
    if (target.bot) {
      await interaction.reply({ embeds: [errorEmbed('Botu soyamazsın, cebi yok.')] });
      return;
    }

    const remaining = getRemainingCooldown(cooldownRepo.getLastUse(guildId, user.id, 'soygun'), COOLDOWN_MS);
    if (remaining > 0) {
      await interaction.reply({
        embeds: [warnEmbed(`🚨 Polis hâlâ mahallede dolaşıyor. **${formatDuration(remaining)}** sonra tekrar dene.`)],
      });
      return;
    }

    const soyguncuBakiye = economyRepo.getBalance(guildId, user.id);
    if (soyguncuBakiye < MIN_SOYGUNCU_BAKIYE) {
      await interaction.reply({
        embeds: [errorEmbed(`Soygun için en az **${MIN_SOYGUNCU_BAKIYE}** TL lazım, yakalanırsan cezayı neyle ödeyeceksin?`)],
      });
      return;
    }

    const hedefBakiye = economyRepo.getBalance(guildId, target.id);
    if (hedefBakiye < MIN_HEDEF_BAKIYE) {
      await interaction.reply({ embeds: [errorEmbed(`<@${target.id}> zaten fakir, cebinden tüy çıkar. Başkasını dene.`)] });
      return;
    }

    cooldownRepo.markUsed(guildId, user.id, 'soygun');

    if (inventoryRepo.consumeItem(guildId, target.id, 'nazar')) {
      await interaction.reply({
        embeds: [warnEmbed(`🧿 <@${target.id}> kişisinin nazar boncuğu parladı! Soygun boşa çıktı, boncuk da çatladı.`)],
      });
      return;
    }

    if (Math.random() < BASARI_SANSI) {
      const oran = 0.1 + Math.random() * 0.15;
      const calinti = Math.min(MAX_CALINTI, Math.max(1, Math.floor(hedefBakiye * oran)));
      economyRepo.transfer(guildId, target.id, user.id, calinti);

      await interaction.reply({
        embeds: [successEmbed(`🦹 Tam zamanında daldın! <@${target.id}> kişisinin cebinden **${calinti}** TL aşırdın.`)],
      });
      return;
    }

    const ceza = Math.max(100, Math.floor(soyguncuBakiye * 0.15));
    economyRepo.transfer(guildId, user.id, target.id, ceza);

    await interaction.reply({
      embeds: [errorEmbed(`👮 Yakalandın! Mahalleli seni bekçiye teslim etti. <@${target.id}> kişisine **${ceza}** TL tazminat ödedin.`)],
    });
  },
};
