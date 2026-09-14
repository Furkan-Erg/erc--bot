const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show info about this server.'),
  async execute(interaction) {
    const guild = interaction.guild;

    const embed = infoEmbed(null)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Boost tier', value: `${guild.premiumTier}`, inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
