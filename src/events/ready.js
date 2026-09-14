const config = require('../config');
const logger = require('../utils/logger');
const remindersRepo = require('../database/repositories/remindersRepo');

const REMINDER_POLL_INTERVAL_MS = 30_000;

function startReminderPolling(client) {
  setInterval(async () => {
    const due = remindersRepo.getDueReminders();
    for (const reminder of due) {
      remindersRepo.deleteReminder(reminder.id);
      try {
        const channel = await client.channels.fetch(reminder.channel_id);
        if (channel?.isTextBased()) {
          await channel.send(`⏰ <@${reminder.user_id}> reminder: ${reminder.message}`);
        }
      } catch (err) {
        logger.error('Failed to deliver reminder', reminder.id, err);
      }
    }
  }, REMINDER_POLL_INTERVAL_MS);
}

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    client.user.setActivity(`${config.prefix}help`);
    startReminderPolling(client);
  },
};
