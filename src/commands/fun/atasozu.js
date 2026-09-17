const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const { ATASOZLERI } = require('../../content/atasozleri');

module.exports = {
  data: new SlashCommandBuilder().setName('atasozu').setDescription('Rastgele bir atasözü ve günümüz yorumu.'),
  async execute(interaction) {
    const { soz, yorum } = ATASOZLERI[Math.floor(Math.random() * ATASOZLERI.length)];
    await interaction.reply({ embeds: [infoEmbed(`📜 **${soz}**\n\n🤔 ${yorum}`)] });
  },
};
