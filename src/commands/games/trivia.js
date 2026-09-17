const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const { SORULAR } = require('../../content/trivia');

const REWARD = 50;
const TIME_LIMIT_MS = 20_000;
const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = {
  data: new SlashCommandBuilder().setName('trivia').setDescription('Bir bilgi yarışması sorusu cevapla, TL kazan.'),
  async execute(interaction) {
    const soru = SORULAR[Math.floor(Math.random() * SORULAR.length)];
    const dogruCevap = soru.secenekler[soru.dogru];
    const secenekler = shuffle(soru.secenekler);
    const dogruIndex = secenekler.indexOf(dogruCevap);

    const row = new ActionRowBuilder().addComponents(
      secenekler.map((secenek, i) =>
        new ButtonBuilder().setCustomId(`trivia_${i}`).setLabel(`${LETTERS[i]}: ${secenek}`.slice(0, 80)).setStyle(ButtonStyle.Primary)
      )
    );

    const liste = secenekler.map((s, i) => `**${LETTERS[i]}.** ${s}`).join('\n');
    const embed = infoEmbed(`${soru.soru}\n\n${liste}`)
      .setTitle(`🧠 ${soru.kategori}`)
      .setFooter({ text: `${TIME_LIMIT_MS / 1000} saniyen var` });

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: TIME_LIMIT_MS,
      filter: (i) => i.user.id === interaction.user.id,
      max: 1,
    });

    collector.on('collect', async (buttonInteraction) => {
      const secilen = parseInt(buttonInteraction.customId.split('_')[1], 10);
      const bildi = secilen === dogruIndex;

      if (bildi) {
        economyRepo.addBalance(interaction.guildId, interaction.user.id, REWARD);
      }

      const sonuc = bildi
        ? successEmbed(`✅ Bildin! Doğru cevap **${dogruCevap}**. **${REWARD}** TL kazandın.`)
        : errorEmbed(`❌ Olmadı. Doğru cevap **${dogruCevap}** imiş.`);

      await buttonInteraction.update({ embeds: [sonuc], components: [] });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await message
          .edit({ embeds: [errorEmbed(`⌛ Süre doldu! Doğru cevap **${dogruCevap}** imiş.`)], components: [] })
          .catch(() => {});
      }
    });
  },
};
