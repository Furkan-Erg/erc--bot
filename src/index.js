const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const loadCommands = require('./handlers/loadCommands');
const loadEvents = require('./handlers/loadEvents');
const logger = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

loadCommands(client);
loadEvents(client);

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', err);
});

client.login(config.token);
