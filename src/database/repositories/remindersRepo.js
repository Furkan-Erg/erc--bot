const db = require('../db');

const insertReminder = db.prepare(`
  INSERT INTO reminders (user_id, channel_id, message, remind_at)
  VALUES (@userId, @channelId, @message, @remindAt)
`);

const selectDueReminders = db.prepare(`
  SELECT * FROM reminders WHERE remind_at <= ?
`);

const deleteReminderStmt = db.prepare(`
  DELETE FROM reminders WHERE id = ?
`);

function createReminder(userId, channelId, message, remindAt) {
  insertReminder.run({ userId, channelId, message, remindAt });
}

function getDueReminders(now = Date.now()) {
  return selectDueReminders.all(now);
}

function deleteReminder(id) {
  deleteReminderStmt.run(id);
}

module.exports = { createReminder, getDueReminders, deleteReminder };
