const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const economyRepo = require('../../database/repositories/economyRepo');
const inventoryRepo = require('../../database/repositories/inventoryRepo');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { urunBul } = require('../../content/dukkan');

const MAX_ADET = 50;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('satinal')
    .setDescription('Dükkândan ürün satın al.')
    .addStringOption((opt) => opt.setName('urun').setDescription('Ürün kodu (örn. nazar)').setRequired(true))
    .addIntegerOption((opt) => opt.setName('adet').setDescription('Kaç tane').setMinValue(1).setRequired(false)),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const urun = urunBul(interaction.options.getString('urun', true));
    const adet = interaction.options.getInteger('adet') ?? 1;

    if (!urun) {
      await interaction.reply({
        embeds: [errorEmbed(`Öyle bir ürün yok. Dükkâna bakmak için \`${config.prefix}dukkan\` yaz.`)],
      });
      return;
    }
    if (adet < 1 || adet > MAX_ADET) {
      await interaction.reply({ embeds: [errorEmbed(`Tek seferde 1 ile ${MAX_ADET} arasında alabilirsin.`)] });
      return;
    }

    const toplam = urun.fiyat * adet;
    const bakiye = economyRepo.getBalance(guildId, user.id);
    if (toplam > bakiye) {
      await interaction.reply({
        embeds: [errorEmbed(`${adet} adet ${urun.ad} **${toplam}** TL tutuyor, cebinde **${bakiye}** TL var. Bakkal veresiye yazmıyor.`)],
      });
      return;
    }

    economyRepo.addBalance(guildId, user.id, -toplam);
    inventoryRepo.addItem(guildId, user.id, urun.id, adet);
    const yeniBakiye = economyRepo.getBalance(guildId, user.id);

    await interaction.reply({
      embeds: [successEmbed(`${urun.emoji} **${adet}x ${urun.ad}** aldın, **${toplam}** TL ödedin. Kalan bakiye: **${yeniBakiye}** TL.`)],
    });
  },
};
