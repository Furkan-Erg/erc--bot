const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

function loadCommands(client) {
  client.commands = new Collection();
  const commandsDir = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category.name);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.js'));

    for (const file of files) {
      const command = require(path.join(categoryPath, file));
      if (!command?.data || !command?.execute) {
        logger.warn(`Skipping invalid command file: ${category.name}/${file}`);
        continue;
      }
      client.commands.set(command.data.name, command);
    }
  }

  logger.info(`Loaded ${client.commands.size} commands.`);
}

module.exports = loadCommands;
