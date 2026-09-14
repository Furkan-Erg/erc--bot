const { SlashCommandBuilder } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');

const SYMBOLS = [
  { emoji: '🍒', weight: 40 },
  { emoji: '🍋', weight: 30 },
  { emoji: '🔔', weight: 15 },
  { emoji: '⭐', weight: 10 },
  { emoji: '💎', weight: 5 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

function spinReel() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const symbol of SYMBOLS) {
    if (roll < symbol.weight) return symbol.emoji;
    roll -= symbol.weight;
  }
  return SYMBOLS[0].emoji;
}

function getMultiplier(reels) {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    if (a === '💎') return 20;
    if (a === '⭐') return 10;
    if (a === '🔔') return 6;
    return 4;
  }
  if (a === b || b === c || a === c) return 1.5;
  return 0;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Spin the slot machine and bet coins.')
    .addIntegerOption((opt) => opt.setName('bet').setDescription('Amount to bet').setMinValue(1).setRequired(true)),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const bet = interaction.options.getInteger('bet', true);
    const balance = economyRepo.getBalance(guildId, user.id);

    if (bet > balance) {
      await interaction.reply({ embeds: [errorEmbed(`You only have **${balance}** coins.`)], ephemeral: true });
      return;
    }

    const reels = [spinReel(), spinReel(), spinReel()];
    const multiplier = getMultiplier(reels);
    const winnings = Math.floor(bet * multiplier);
    const net = winnings - bet;

    economyRepo.addBalance(guildId, user.id, net);
    const newBalance = economyRepo.getBalance(guildId, user.id);

    const display = `🎰 [ ${reels.join(' | ')} ]`;
    const resultEmbed =
      net > 0
        ? successEmbed(`${display}\nYou won **${winnings}** coins (net +${net})! Balance: **${newBalance}**.`)
        : net === 0
          ? infoEmbed(`${display}\nBroke even. Balance: **${newBalance}**.`)
          : errorEmbed(`${display}\nYou lost **${bet}** coins. Balance: **${newBalance}**.`);

    await interaction.reply({ embeds: [resultEmbed] });
  },
};
