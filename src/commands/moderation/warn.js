const { SlashCommandBuilder } = require('discord.js');
const warningsRepo = require('../../database/repositories/warningsRepo');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isModerator } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member.')
    .addUserOption((opt) => opt.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),
  async execute(interaction) {
    if (!isModerator(interaction)) {
      await interaction.reply({ embeds: [errorEmbed('You need moderator permissions to use this.')], ephemeral: true });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    warningsRepo.addWarning(interaction.guildId, user.id, interaction.user.id, reason);

    await interaction.reply({
      embeds: [successEmbed(`⚠️ Warned **${user.tag}**. Reason: ${reason}`)],
    });
  },
};
