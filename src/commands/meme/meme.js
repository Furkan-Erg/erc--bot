const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('meme').setDescription('Rastgele bir meme getirir.'),
  async execute(interaction) {
    await interaction.deferReply();

    const res = await fetch('https://meme-api.com/gimme');
    if (!res.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Şu an meme çekemedim, biraz sonra tekrar dene.')] });
      return;
    }

    const data = await res.json();
    if (data.nsfw) {
      await interaction.editReply({ embeds: [errorEmbed('NSFW bir sonuç geldi, tekrar dener misin?')] });
      return;
    }

    const embed = infoEmbed(null)
      .setTitle(data.title)
      .setURL(data.postLink)
      .setImage(data.url)
      .setFooter({ text: `r/${data.subreddit} • 👍 ${data.ups}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
