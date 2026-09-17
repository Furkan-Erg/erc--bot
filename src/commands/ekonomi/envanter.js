const { SlashCommandBuilder } = require('discord.js');
const inventoryRepo = require('../../database/repositories/inventoryRepo');
const { infoEmbed } = require('../../utils/embeds');
const { urunBul } = require('../../content/dukkan');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('envanter')
    .setDescription('Bir kullanıcının envanterini göster.')
    .addUserOption((opt) => opt.setName('user').setDescription('Envanterine bakılacak kişi').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const esyalar = inventoryRepo.getItems(interaction.guildId, target.id);

    if (esyalar.length === 0) {
      await interaction.reply({ embeds: [infoEmbed(`🎒 **${target.tag}** envanteri bomboş. Bir simit bile yok.`)] });
      return;
    }

    const satirlar = esyalar.map((e) => {
      const urun = urunBul(e.item_id);
      return urun ? `${urun.emoji} **${urun.ad}** × ${e.quantity}` : `❔ ${e.item_id} × ${e.quantity}`;
    });

    await interaction.reply({ embeds: [infoEmbed(satirlar.join('\n')).setTitle(`🎒 ${target.tag} envanteri`)] });
  },
};
