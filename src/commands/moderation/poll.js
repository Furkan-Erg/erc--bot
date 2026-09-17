const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Hızlı bir anket oluştur.')
    .addStringOption((opt) => opt.setName('question').setDescription('Anket sorusu').setRequired(true))
    .addStringOption((opt) => opt.setName('option1').setDescription('Birinci seçenek').setRequired(true))
    .addStringOption((opt) => opt.setName('option2').setDescription('İkinci seçenek').setRequired(true))
    .addStringOption((opt) => opt.setName('option3').setDescription('Üçüncü seçenek').setRequired(false))
    .addStringOption((opt) => opt.setName('option4').setDescription('Dördüncü seçenek').setRequired(false)),
  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    const options = [
      interaction.options.getString('option1', true),
      interaction.options.getString('option2', true),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
    ].filter(Boolean);

    const description = options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n');
    const embed = infoEmbed(description).setTitle(`📊 ${question}`).setFooter({ text: `Anketi açan: ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();

    for (let i = 0; i < options.length; i++) {
      await message.react(NUMBER_EMOJIS[i]);
    }
  },
};
