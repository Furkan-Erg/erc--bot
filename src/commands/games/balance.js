const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription("Check a user's coin balance.")
    .addUserOption((opt) => opt.setName('user').setDescription('User to check').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const balance = economyRepo.getBalance(interaction.guildId, user.id);

    await interaction.reply({ embeds: [infoEmbed(`💰 **${user.tag}** has **${balance}** coins.`)] });
  },
};
