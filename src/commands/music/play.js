const { SlashCommandBuilder } = require('discord.js');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');
const musicManager = require('../../music/musicManager');

function isYoutubeUrl(str) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(str);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('YouTube\'dan şarkı çal.')
    .addStringOption((opt) => opt.setName('sarki').setDescription('Şarkı adı veya YouTube linki').setRequired(true)),
  async execute(interaction) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      await interaction.reply({
        embeds: [errorEmbed('Kanalda yoksun ki dayı, önce bir sesli kanala gir.')],
        ephemeral: true,
      });
      return;
    }

    const query = interaction.options.getString('sarki', true);
    await interaction.deferReply();

    let url;
    let title;

    try {
      if (isYoutubeUrl(query)) {
        const info = await ytdl.getBasicInfo(query);
        url = info.videoDetails.video_url;
        title = info.videoDetails.title;
      } else {
        const result = await ytSearch(query);
        const video = result.videos?.[0];
        if (!video) {
          await interaction.editReply({ embeds: [errorEmbed('Bu aramaya bir şey bulamadım.')] });
          return;
        }
        url = video.url;
        title = video.title;
      }
    } catch {
      await interaction.editReply({ embeds: [errorEmbed('Şarkıyı bulamadım ya da çekemedim, başka bir şey dene.')] });
      return;
    }

    const startedImmediately = musicManager.enqueue(interaction.guild, voiceChannel, interaction.channel, {
      url,
      title,
      requestedBy: interaction.user.tag,
    });

    await interaction.editReply({
      embeds: [
        startedImmediately
          ? successEmbed(`🎶 Şimdi çalıyor: **${title}**`)
          : infoEmbed(`➕ Sıraya attım kanka, biraz bekle: **${title}**`),
      ],
    });
  },
};
