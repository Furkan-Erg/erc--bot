const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const levelsRepo = require('../../database/repositories/levelsRepo');
const { infoEmbed } = require('../../utils/embeds');
const { levelInfo } = require('../../utils/levels');
const { renderRankCard } = require('../../utils/rankCard');
const logger = require('../../utils/logger');

function metinBar(oran) {
  const dolu = Math.round(oran * 15);
  return '🟥'.repeat(dolu) + '⬛'.repeat(15 - dolu);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seviye')
    .setDescription('Seviye kartını göster.')
    .addUserOption((opt) => opt.setName('user').setDescription('Kimin seviyesi').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const totalXp = levelsRepo.getXp(interaction.guildId, user.id);
    const rank = levelsRepo.getRank(interaction.guildId, user.id);
    const { level, current, needed } = levelInfo(totalXp);

    await interaction.deferReply();

    try {
      const buffer = await renderRankCard({
        username: user.username,
        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
        level,
        current,
        needed,
        rank,
        totalXp,
      });
      await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'seviye.png' })] });
    } catch (err) {
      logger.warn('Seviye kartı çizilemedi, metin moduna geçiliyor', err);
      const embed = infoEmbed(
        `**Seviye ${level}** · Sıra #${rank}\n${metinBar(current / needed)}\n${current} / ${needed} XP (toplam ${totalXp})`
      ).setTitle(`📊 ${user.username}`);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
