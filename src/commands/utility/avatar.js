const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Bir kullanıcının profil fotoğrafını büyük göster.')
    .addUserOption((opt) => opt.setName('user').setDescription('Kimin avatarı').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const url = user.displayAvatarURL({ size: 1024 });
    const png = user.displayAvatarURL({ extension: 'png', size: 1024 });

    const embed = infoEmbed(`[PNG](${png}) · [Orijinal](${url})`).setTitle(`🖼️ ${user.tag}`).setImage(url);

    await interaction.reply({ embeds: [embed] });
  },
};
