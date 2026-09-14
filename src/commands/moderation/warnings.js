const { SlashCommandBuilder } = require('discord.js');
const warningsRepo = require('../../database/repositories/warningsRepo');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');
const { isModerator } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("View a member's warning history.")
    .addUserOption((opt) => opt.setName('user').setDescription('Member to check').setRequired(true)),
  async execute(interaction) {
    if (!isModerator(interaction)) {
      await interaction.reply({ embeds: [errorEmbed('You need moderator permissions to use this.')], ephemeral: true });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const warnings = warningsRepo.getWarnings(interaction.guildId, user.id);

    if (warnings.length === 0) {
      await interaction.reply({ embeds: [infoEmbed(`**${user.tag}** has no warnings.`)] });
      return;
    }

    const lines = warnings
      .slice(0, 10)
      .map((w, i) => `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.created_at / 1000)}:R> (by <@${w.moderator_id}>)`);

    const embed = infoEmbed(lines.join('\n')).setTitle(`Warnings for ${user.tag} (${warnings.length} total)`);
    await interaction.reply({ embeds: [embed] });
  },
};
