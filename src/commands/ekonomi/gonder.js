const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gonder')
    .setDescription('Birine TL gönder.')
    .addUserOption((opt) => opt.setName('user').setDescription('Parayı alacak kişi').setRequired(true))
    .addIntegerOption((opt) => opt.setName('miktar').setDescription('Gönderilecek miktar').setMinValue(1).setRequired(true)),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const target = interaction.options.getUser('user', true);
    const miktar = interaction.options.getInteger('miktar', true);

    if (target.id === user.id) {
      await interaction.reply({ embeds: [errorEmbed('Kendine para gönderip zengin olamazsın dayı, öyle olsaydı hepimiz zengindik.')] });
      return;
    }
    if (target.bot) {
      await interaction.reply({ embeds: [errorEmbed('Botların cebi yok, parayı çöpe atma.')] });
      return;
    }
    if (miktar <= 0) {
      await interaction.reply({ embeds: [errorEmbed('Geçerli bir miktar gir.')] });
      return;
    }

    const bakiye = economyRepo.getBalance(guildId, user.id);
    if (miktar > bakiye) {
      await interaction.reply({ embeds: [errorEmbed(`Cebinde sadece **${bakiye}** TL var, olmayan parayı gönderemezsin.`)] });
      return;
    }

    economyRepo.transfer(guildId, user.id, target.id, miktar);
    const yeniBakiye = economyRepo.getBalance(guildId, user.id);

    await interaction.reply({
      embeds: [successEmbed(`💸 <@${target.id}> kişisine **${miktar}** TL gönderdin. Kalan bakiye: **${yeniBakiye}** TL.`)],
    });
  },
};
