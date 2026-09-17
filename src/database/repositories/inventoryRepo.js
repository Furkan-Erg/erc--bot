const db = require('../db');

const addItemStmt = db.prepare(`
  INSERT INTO inventory (guild_id, user_id, item_id, quantity)
  VALUES (@guildId, @userId, @itemId, @quantity)
  ON CONFLICT (guild_id, user_id, item_id)
  DO UPDATE SET quantity = quantity + @quantity
`);

const selectItemStmt = db.prepare(`
  SELECT quantity FROM inventory
  WHERE guild_id = ? AND user_id = ? AND item_id = ?
`);

const selectAllStmt = db.prepare(`
  SELECT item_id, quantity FROM inventory
  WHERE guild_id = ? AND user_id = ? AND quantity > 0
`);

const removeItemStmt = db.prepare(`
  UPDATE inventory SET quantity = quantity - @quantity
  WHERE guild_id = @guildId AND user_id = @userId AND item_id = @itemId AND quantity >= @quantity
`);

function addItem(guildId, userId, itemId, quantity = 1) {
  addItemStmt.run({ guildId, userId, itemId, quantity });
}

function getQuantity(guildId, userId, itemId) {
  return selectItemStmt.get(guildId, userId, itemId)?.quantity ?? 0;
}

function getItems(guildId, userId) {
  return selectAllStmt.all(guildId, userId);
}

function consumeItem(guildId, userId, itemId, quantity = 1) {
  const result = removeItemStmt.run({ guildId, userId, itemId, quantity });
  return result.changes > 0;
}

module.exports = { addItem, getQuantity, getItems, consumeItem };
