const { EmbedBuilder } = require('discord.js');

const COLORS = {
  success: 0x57f287,
  error: 0xed4245,
  info: 0x5865f2,
  warn: 0xfee75c,
};

function baseEmbed(color) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function successEmbed(description) {
  return baseEmbed(COLORS.success).setDescription(description);
}

function errorEmbed(description) {
  return baseEmbed(COLORS.error).setDescription(description);
}

function infoEmbed(description) {
  return baseEmbed(COLORS.info).setDescription(description);
}

function warnEmbed(description) {
  return baseEmbed(COLORS.warn).setDescription(description);
}

module.exports = { COLORS, baseEmbed, successEmbed, errorEmbed, infoEmbed, warnEmbed };
