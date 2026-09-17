const { SlashCommandBuilder } = require('discord.js');
const warningsRepo = require('../../database/repositories/warningsRepo');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const { isModerator } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Bir üyenin uyarı geçmişini göster.')
    .addUserOption((opt) => opt.setName('user').setDescription('Kontrol edilecek üye').setRequired(true)),
  async execute(interaction) {
    if (!isModerator(interaction)) {
      await interaction.reply({ embeds: [errorEmbed('Bu iş moderatör yetkisi ister, senin harcın değil.')], ephemeral: true });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const warnings = warningsRepo.getWarnings(interaction.guildId, user.id);

    if (warnings.length === 0) {
      await interaction.reply({ embeds: [infoEmbed(`**${user.tag}** temiz, hiç uyarısı yok.`)] });
      return;
    }

    const lines = warnings
      .slice(0, 10)
      .map((w, i) => `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.created_at / 1000)}:R> (veren: <@${w.moderator_id}>)`);

    const embed = infoEmbed(lines.join('\n')).setTitle(`${user.tag} için uyarılar (toplam ${warnings.length})`);
    await interaction.reply({ embeds: [embed] });
  },
};
