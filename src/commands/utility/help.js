const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { infoEmbed } = require('../../utils/embeds');

function formatUsage(command) {
  const options = command.data.toJSON().options || [];
  const args = options
    .map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`))
    .join(' ');
  return `${config.prefix}${command.data.name}${args ? ` ${args}` : ''}`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Tüm komutları listele.'),
  async execute(interaction) {
    const commands = [...interaction.client.commands.values()].sort((a, b) => a.data.name.localeCompare(b.data.name));

    const lines = commands.map((cmd) => `\`${formatUsage(cmd)}\` — ${cmd.data.description}`);

    const embed = infoEmbed(lines.join('\n')).setTitle('📖 Komutlar').setFooter({
      text: `Önek: ${config.prefix}  •  <zorunlu>  [opsiyonel]  •  kullanıcıları @ ile etiketle, çok kelimeli metinler için "tırnak" kullan`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
