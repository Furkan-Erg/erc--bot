const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a quick reaction poll.')
    .addStringOption((opt) => opt.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption((opt) => opt.setName('option1').setDescription('First option').setRequired(true))
    .addStringOption((opt) => opt.setName('option2').setDescription('Second option').setRequired(true))
    .addStringOption((opt) => opt.setName('option3').setDescription('Third option').setRequired(false))
    .addStringOption((opt) => opt.setName('option4').setDescription('Fourth option').setRequired(false)),
  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    const options = [
      interaction.options.getString('option1', true),
      interaction.options.getString('option2', true),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
    ].filter(Boolean);

    const description = options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n');
    const embed = infoEmbed(description).setTitle(`📊 ${question}`).setFooter({ text: `Poll by ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();

    for (let i = 0; i < options.length; i++) {
      await message.react(NUMBER_EMOJIS[i]);
    }
  },
};
