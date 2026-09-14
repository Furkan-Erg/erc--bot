const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('memes').setDescription('Get a random meme.'),
  async execute(interaction) {
    await interaction.deferReply();

    const res = await fetch('https://meme-api.com/gimme');
    if (!res.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Could not fetch a meme right now, try again later.')] });
      return;
    }

    const data = await res.json();
    if (data.nsfw) {
      await interaction.editReply({ embeds: [errorEmbed('Got an NSFW result, try again.')] });
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
