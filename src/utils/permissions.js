const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

function isModerator(interaction) {
  const member = interaction.member;
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;
  if (config.modRoleId && member.roles.cache.has(config.modRoleId)) return true;
  return false;
}

module.exports = { isModerator };
