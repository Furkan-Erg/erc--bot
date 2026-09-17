const { SlashCommandBuilder } = require('discord.js');
const afkRepo = require('../../database/repositories/afkRepo');
const { successEmbed } = require('../../utils/embeds');

const MAX_SEBEP = 200;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('AFK ol; seni etiketleyenlere bot haber verir.')
    .addStringOption((opt) => opt.setName('sebep').setDescription('Neden yoksun').setRequired(false)),
  async execute(interaction) {
    const sebep = (interaction.options.getString('sebep') || 'Çay molası').slice(0, MAX_SEBEP);
    afkRepo.setAfk(interaction.guildId, interaction.user.id, sebep);

    await interaction.reply({
      embeds: [successEmbed(`💤 AFK oldun: **${sebep}**. Bir sonraki mesajında geri dönmüş sayılacaksın.`)],
    });
  },
};
