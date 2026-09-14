const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete recent messages in this channel.')
    .addIntegerOption((opt) =>
      opt.setName('count').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const count = interaction.options.getInteger('count', true);

    await interaction.deferReply({ ephemeral: true });

    const deleted = await interaction.channel.bulkDelete(count, true).catch(() => null);
    if (!deleted) {
      await interaction.editReply({ embeds: [errorEmbed('Could not delete messages (they may be older than 14 days).')] });
      return;
    }

    await interaction.editReply({ embeds: [successEmbed(`🧹 Deleted ${deleted.size} messages.`)] });
  },
};
