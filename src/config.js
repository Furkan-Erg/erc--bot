require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  token: required('DISCORD_TOKEN'),
  clientId: process.env.CLIENT_ID || null,
  guildId: process.env.GUILD_ID || null,
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || null,
  modRoleId: process.env.MOD_ROLE_ID || null,
  prefix: process.env.PREFIX || '!',
};
