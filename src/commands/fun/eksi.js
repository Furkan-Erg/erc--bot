const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const { ACILIS, GOVDE, KAPANIS } = require('../../content/eksiGirdileri');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwoFarkli(arr) {
  const first = pick(arr);
  let second = pick(arr);
  while (second === first && arr.length > 1) {
    second = pick(arr);
  }
  return [first, second];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eksi')
    .setDescription('Verdiğin başlık için sahte bir ekşi sözlük girdisi üretir.')
    .addStringOption((opt) => opt.setName('baslik').setDescription('Girdi başlığı').setRequired(true)),
  async execute(interaction) {
    const baslik = interaction.options.getString('baslik', true);
    const [govde1, govde2] = pickTwoFarkli(GOVDE);
    const favori = Math.floor(Math.random() * 400) + 12;

    const entry = `${pick(ACILIS)}. ${govde1}. ${govde2}.\n\n${pick(KAPANIS)}\n\n— <@${interaction.user.id}> · ~${favori} favori`;

    await interaction.reply({
      embeds: [infoEmbed(entry).setTitle(`📖 ${baslik.toLocaleLowerCase('tr-TR')}`)],
    });
  },
};
