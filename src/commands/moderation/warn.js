const { SlashCommandBuilder } = require('discord.js');
const warningsRepo = require('../../database/repositories/warningsRepo');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isModerator } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Bir üyeye uyarı ver.')
    .addUserOption((opt) => opt.setName('user').setDescription('Uyarılacak üye').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Uyarı sebebi').setRequired(true)),
  async execute(interaction) {
    if (!isModerator(interaction)) {
      await interaction.reply({ embeds: [errorEmbed('Bu iş moderatör yetkisi ister, senin harcın değil.')], ephemeral: true });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    warningsRepo.addWarning(interaction.guildId, user.id, interaction.user.id, reason);

    await interaction.reply({
      embeds: [successEmbed(`⚠️ **${user.tag}** uyarıldı. Sebep: ${reason}`)],
    });
  },
};
