const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');

const KATEGORILER = [
  { klasor: 'ekonomi', baslik: '💰 Ekonomi', adlar: ['ekonomi', 'para'] },
  { klasor: 'games', baslik: '🎮 Oyunlar', adlar: ['oyunlar', 'oyun', 'games'] },
  { klasor: 'fun', baslik: '🎉 Eğlence', adlar: ['eglence', 'eğlence', 'fun'] },
  { klasor: 'meme', baslik: '🖼️ Meme', adlar: ['meme'] },
  { klasor: 'music', baslik: '🎵 Müzik', adlar: ['muzik', 'müzik', 'music'] },
  { klasor: 'moderation', baslik: '🛡️ Moderasyon', adlar: ['moderasyon', 'moderation', 'mod'] },
  { klasor: 'utility', baslik: '🧰 Yardımcı', adlar: ['yardimci', 'yardımcı', 'utility'] },
];

function formatUsage(command) {
  const options = command.data.toJSON().options || [];
  const args = options.map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`)).join(' ');
  return `${config.prefix}${command.data.name}${args ? ` ${args}` : ''}`;
}

function kategoriBul(girdi) {
  const aranan = girdi.toLocaleLowerCase('tr-TR');
  return KATEGORILER.find((k) => k.adlar.includes(aranan)) || null;
}

function kategoridekiler(client, klasor) {
  return [...client.commands.values()]
    .filter((c) => c.category === klasor)
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Komutları listele. Kategori ya da komut adı verirsen detay gösterir.')
    .addStringOption((opt) => opt.setName('konu').setDescription('Kategori veya komut adı').setRequired(false)),
  async execute(interaction) {
    const { client } = interaction;
    const konu = interaction.options.getString('konu');

    if (konu) {
      const komut = client.commands.get(konu.toLowerCase().replace(config.prefix, ''));
      if (komut) {
        await interaction.reply({
          embeds: [infoEmbed(`\`${formatUsage(komut)}\`\n\n${komut.data.description}`).setTitle(`📖 ${komut.data.name}`)],
        });
        return;
      }

      const kategori = kategoriBul(konu);
      if (!kategori) {
        await interaction.reply({ embeds: [errorEmbed(`**${konu}** diye bir kategori ya da komut bulamadım.`)] });
        return;
      }

      const satirlar = kategoridekiler(client, kategori.klasor).map((c) => `\`${formatUsage(c)}\`\n${c.data.description}`);
      await interaction.reply({
        embeds: [
          infoEmbed(satirlar.join('\n\n') || 'Bu kategoride komut yok.')
            .setTitle(kategori.baslik)
            .setFooter({ text: '<zorunlu>  [opsiyonel]  •  kullanıcıları @ ile etiketle, çok kelimeli metinler için "tırnak" kullan' }),
        ],
      });
      return;
    }

    const embed = infoEmbed(`Detay için: \`${config.prefix}help <kategori>\` ya da \`${config.prefix}help <komut>\``)
      .setTitle('📖 Komutlar')
      .setFooter({ text: `Önek: ${config.prefix}  •  Toplam ${client.commands.size} komut` });

    for (const kategori of KATEGORILER) {
      const komutlar = kategoridekiler(client, kategori.klasor);
      if (komutlar.length === 0) continue;
      const deger = komutlar.map((c) => `\`${c.data.name}\``).join(' ');
      embed.addFields({ name: `${kategori.baslik} (${kategori.adlar[0]})`, value: deger.slice(0, 1024) });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
