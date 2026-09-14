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
  data: new SlashCommandBuilder().setName('trivia').setDescription('Answer a trivia question for coins.'),
  async execute(interaction) {
    await interaction.deferReply();

    const res = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
    if (!res.ok) {
      await interaction.editReply({ embeds: [errorEmbed('Could not fetch a trivia question right now.')] });
      return;
    }

    const data = await res.json();
    const question = data?.results?.[0];
    if (!question) {
      await interaction.editReply({ embeds: [errorEmbed('No trivia question available, try again.')] });
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
    const embed = infoEmbed(`${decodeHtml(question.question)}\n\n${answerList}`).setTitle(
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
        ? successEmbed(`✅ Correct! The answer was **${decodeHtml(question.correct_answer)}**. You earned **${REWARD}** coins.`)
        : errorEmbed(`❌ Wrong. The correct answer was **${decodeHtml(question.correct_answer)}**.`);

      await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction
          .editReply({
            embeds: [errorEmbed(`⌛ Time's up! The correct answer was **${decodeHtml(question.correct_answer)}**.`)],
            components: [],
          })
          .catch(() => {});
      }
    });
  },
};
