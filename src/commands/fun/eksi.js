const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const { ACILIS, GOVDE, KAPANIS } = require('../../content/eksiGirdileri');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickFarkli(arr, adet) {
  const havuz = [...arr];
  const secilenler = [];
  while (secilenler.length < adet && havuz.length > 0) {
    const index = Math.floor(Math.random() * havuz.length);
    secilenler.push(havuz.splice(index, 1)[0]);
  }
  return secilenler;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eksi')
    .setDescription('Verdiğin başlık için sahte bir ekşi sözlük girdisi üretir.')
    .addStringOption((opt) => opt.setName('baslik').setDescription('Girdi başlığı').setRequired(true)),
  async execute(interaction) {
    const baslik = interaction.options.getString('baslik', true);
    const govdeCumleleri = pickFarkli(GOVDE, Math.random() < 0.5 ? 2 : 3);
    const favori = Math.floor(Math.random() * 400) + 12;

    const entry = `${pick(ACILIS)}. ${govdeCumleleri.join('. ')}.\n\n${pick(KAPANIS)}\n\n— <@${interaction.user.id}> · ~${favori} favori`;

    await interaction.reply({
      embeds: [infoEmbed(entry).setTitle(`📖 ${baslik.toLocaleLowerCase('tr-TR')}`)],
    });
  },
};
