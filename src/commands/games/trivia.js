const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');

const REWARD = 50;
const TIME_LIMIT_MS = 20_000;
const LETTERS = ['A', 'B', 'C', 'D'];

function decodeHtml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&rsquo;/g, '’');
}

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
    await interaction.deferReply();

    const res = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
    if (!res.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Şu an soru çekemedim, biraz sonra tekrar dene.')] });
      return;
    }

    const data = await res.json();
    const question = data?.results?.[0];
    if (!question) {
      await interaction.editReply({ embeds: [errorEmbed('Soru bulunamadı, tekrar dener misin?')] });
      return;
    }

    const answers = shuffle([...question.incorrect_answers, question.correct_answer]);
    const correctIndex = answers.indexOf(question.correct_answer);

    const row = new ActionRowBuilder().addComponents(
      answers.map((answer, i) =>
        new ButtonBuilder().setCustomId(`trivia_${i}`).setLabel(`${LETTERS[i]}: ${decodeHtml(answer)}`.slice(0, 80)).setStyle(ButtonStyle.Primary)
      )
    );

    const answerList = answers.map((a, i) => `**${LETTERS[i]}.** ${decodeHtml(a)}`).join('\n');
    const embed = infoEmbed(`${decodeHtml(question.question)}\n\n${answerList}\n\n*(Sorular İngilizce geliyor, kusura bakma dayı — kaynak API başka çare yok.)*`).setTitle(
      `🧠 ${decodeHtml(question.category)} (${question.difficulty})`
    );

    const message = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: TIME_LIMIT_MS,
      filter: (i) => i.user.id === interaction.user.id,
      max: 1,
    });

    collector.on('collect', async (buttonInteraction) => {
      const chosenIndex = parseInt(buttonInteraction.customId.split('_')[1], 10);
      const correct = chosenIndex === correctIndex;

      if (correct) {
        economyRepo.addBalance(interaction.guildId, interaction.user.id, REWARD);
      }

      const resultEmbed = correct
        ? successEmbed(`✅ Bildin! Doğru cevap **${decodeHtml(question.correct_answer)}**. **${REWARD}** TL kazandın.`)
        : errorEmbed(`❌ Olmadı. Doğru cevap **${decodeHtml(question.correct_answer)}** imiş.`);

      await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction
          .editReply({
            embeds: [errorEmbed(`⌛ Süre doldu! Doğru cevap **${decodeHtml(question.correct_answer)}** imiş.`)],
            components: [],
          })
          .catch(() => {});
      }
    });
  },
};
