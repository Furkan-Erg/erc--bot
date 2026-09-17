const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Bu sunucu hakkında bilgi göster.'),
  async execute(interaction) {
    const guild = interaction.guild;

    const embed = infoEmbed(null)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: 'Üye sayısı', value: `${guild.memberCount}`, inline: true },
        { name: 'Boost seviyesi', value: `${guild.premiumTier}`, inline: true },
        { name: 'Boost sayısı', value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
        { name: 'Kuruluş', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
