const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const economyRepo = require('../../database/repositories/economyRepo');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function freshDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

function handValue(hand) {
  let total = hand.reduce((sum, c) => sum + cardValue(c), 0);
  let aces = hand.filter((c) => c.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function formatHand(hand) {
  return hand.map((c) => `${c.rank}${c.suit}`).join(' ');
}

function buildRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('hit').setLabel('Çek').setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('stand').setLabel('Dur').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );
}

function buildEmbed({ player, dealer, revealDealer, status }) {
  const dealerDisplay = revealDealer ? `${formatHand(dealer)} (${handValue(dealer)})` : `${dealer[0].rank}${dealer[0].suit} ??`;
  const embed = infoEmbed(
    `**Kasa:** ${dealerDisplay}\n**Sen:** ${formatHand(player)} (${handValue(player)})\n\n${status}`
  ).setTitle('🃏 Blackjack');
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Kasaya karşı bir el blackjack oyna.')
    .addIntegerOption((opt) => opt.setName('bet').setDescription('Bahis miktarı').setMinValue(1).setRequired(true)),
  async execute(interaction) {
    const { guildId, user } = interaction;
    const bet = interaction.options.getInteger('bet', true);
    const balance = economyRepo.getBalance(guildId, user.id);

    if (bet > balance) {
      await interaction.reply({ embeds: [errorEmbed(`Cebinde sadece **${balance}** TL var, o kadar bahis oynayamazsın.`)], ephemeral: true });
      return;
    }

    const deck = freshDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];

    const playerBlackjack = handValue(player) === 21;

    if (playerBlackjack) {
      const winnings = Math.floor(bet * 1.5);
      economyRepo.addBalance(guildId, user.id, winnings);
      await interaction.reply({
        embeds: [
          buildEmbed({ player, dealer, revealDealer: true, status: `🎉 Blackjack! **${winnings}** TL kazandın.` }),
        ],
      });
      return;
    }

    const message = await interaction.reply({
      embeds: [buildEmbed({ player, dealer, revealDealer: false, status: 'Çek mi, dur mu?' })],
      components: [buildRow()],
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: (i) => i.user.id === user.id,
    });

    let finished = false;

    async function finish(buttonInteraction, status, netChange) {
      finished = true;
      economyRepo.addBalance(guildId, user.id, netChange);
      await buttonInteraction.update({
        embeds: [buildEmbed({ player, dealer, revealDealer: true, status })],
        components: [buildRow(true)],
      });
      collector.stop();
    }

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId === 'hit') {
        player.push(deck.pop());
        const total = handValue(player);

        if (total > 21) {
          await finish(buttonInteraction, `💥 Battın! **${bet}** TL gitti.`, -bet);
          return;
        }

        await buttonInteraction.update({
          embeds: [buildEmbed({ player, dealer, revealDealer: false, status: 'Çek mi, dur mu?' })],
          components: [buildRow()],
        });
        return;
      }

      // stand
      while (handValue(dealer) < 17) {
        dealer.push(deck.pop());
      }

      const playerTotal = handValue(player);
      const dealerTotal = handValue(dealer);

      if (dealerTotal > 21 || playerTotal > dealerTotal) {
        await finish(buttonInteraction, `🎉 Kazandın! **${bet}** TL cebine girdi.`, bet);
      } else if (playerTotal === dealerTotal) {
        await finish(buttonInteraction, '🤝 Berabere — bahis iade edildi.', 0);
      } else {
        await finish(buttonInteraction, `😢 Kasa kazandı. **${bet}** TL gitti.`, -bet);
      }
    });

    collector.on('end', async () => {
      if (finished) return;
      economyRepo.addBalance(guildId, user.id, -bet);
      await interaction
        .editReply({
          embeds: [buildEmbed({ player, dealer, revealDealer: true, status: `⌛ Süre doldu. **${bet}** TL gitti.` })],
          components: [buildRow(true)],
        })
        .catch(() => {});
    });
  },
};
