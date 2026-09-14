const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show info about a member.')
    .addUserOption((opt) => opt.setName('user').setDescription('Member to look up').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = infoEmbed(null)
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` },
        member
          ? { name: 'Joined server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` }
          : { name: 'Joined server', value: 'Not in this server' },
        member ? { name: 'Roles', value: member.roles.cache.map((r) => r.toString()).join(' ') || 'None' } : { name: 'Roles', value: 'N/A' }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
