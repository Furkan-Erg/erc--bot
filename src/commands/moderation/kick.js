const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption((opt) => opt.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], ephemeral: true });
      return;
    }
    if (!member.kickable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot kick that member (role hierarchy or missing permission).')], ephemeral: true });
      return;
    }

    await member.kick(reason);
    await interaction.reply({ embeds: [successEmbed(`👢 Kicked **${user.tag}**. Reason: ${reason}`)] });
  },
};
