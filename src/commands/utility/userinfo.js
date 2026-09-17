const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Bir üye hakkında bilgi göster.')
    .addUserOption((opt) => opt.setName('user').setDescription('Bakılacak üye').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = infoEmbed(null)
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Hesap oluşturma', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` },
        member
          ? { name: 'Sunucuya katılma', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` }
          : { name: 'Sunucuya katılma', value: 'Bu sunucuda değil' },
        member ? { name: 'Roller', value: member.roles.cache.map((r) => r.toString()).join(' ') || 'Yok' } : { name: 'Roller', value: 'Yok' }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
