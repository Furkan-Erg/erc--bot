const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { baseEmbed, COLORS } = require('../utils/embeds');

// Buton id'leri "music:" ile başlıyor; interactionCreate bunlara bakarak paneli tanıyor.
const PREFIX = 'music:';

const LOOP_ETIKETLERI = {
  kapali: 'Döngü kapalı',
  sarki: 'Şarkı tekrarı',
  kuyruk: 'Kuyruk tekrarı',
};

function duraklatilmis(state) {
  const durum = state.player.state.status;
  return durum === AudioPlayerStatus.Paused || durum === AudioPlayerStatus.AutoPaused;
}

function panelEmbed(state) {
  const { current, queue } = state;
  const satirlar = [`Ekleyen: ${current.requestedBy ?? 'bilinmiyor'}`];

  if (queue.length > 0) {
    satirlar.push(`Sırada **${queue.length}** şarkı var. Sıradaki: **${queue[0].title}**`);
  }
  if (state.loop !== 'kapali') {
    satirlar.push(`🔁 ${LOOP_ETIKETLERI[state.loop]}`);
  }
  if (duraklatilmis(state)) {
    satirlar.push('⏸️ Duraklatıldı');
  }

  const embed = baseEmbed(COLORS.info)
    .setTitle(`🎶 ${current.title}`.slice(0, 256))
    .setDescription(satirlar.join('\n'));

  if (/^https?:\/\//.test(current.url ?? '')) {
    embed.setURL(current.url);
  }

  return embed;
}

function panelButtons(state) {
  const durakli = duraklatilmis(state);

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}playpause`)
        .setLabel(durakli ? 'Devam' : 'Duraklat')
        .setEmoji(durakli ? '▶️' : '⏸️')
        .setStyle(durakli ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}skip`)
        .setLabel('Atla')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}stop`)
        .setLabel('Durdur')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}loop`)
        .setLabel(LOOP_ETIKETLERI[state.loop])
        .setEmoji('🔁')
        .setStyle(state.loop === 'kapali' ? ButtonStyle.Secondary : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}shuffle`)
        .setLabel('Karıştır')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(state.queue.length < 2)
    ),
  ];
}

// Panel mesajının hem gönderilirken hem düzenlenirken kullandığı gövde.
function build(state) {
  return { embeds: [panelEmbed(state)], components: panelButtons(state) };
}

module.exports = { PREFIX, LOOP_ETIKETLERI, build, duraklatilmis };
