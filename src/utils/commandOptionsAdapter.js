const OPTION_TYPE = { STRING: 3, INTEGER: 4, USER: 6 };

function stripQuotes(str) {
  const trimmed = str.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function takeToken(str) {
  const trimmed = str.trim();
  if (!trimmed) return { value: '', rest: '' };
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    if (end === -1) return { value: trimmed.slice(1), rest: '' };
    return { value: trimmed.slice(1, end), rest: trimmed.slice(end + 1) };
  }
  const match = trimmed.match(/^\S+/);
  const value = match ? match[0] : '';
  return { value, rest: trimmed.slice(value.length) };
}

/**
 * Maps raw text after the command name onto the command's SlashCommandBuilder
 * option definitions, positionally. USER options are resolved from Discord's
 * parsed message mentions (not from the raw token text) so `@user` works
 * exactly like it does for slash commands.
 */
function parseOptions(rawArgs, optionsMeta, message) {
  const values = {};
  let remaining = rawArgs;
  const mentionedUsers = [...message.mentions.users.values()];
  let mentionIndex = 0;

  optionsMeta.forEach((opt, idx) => {
    const isLast = idx === optionsMeta.length - 1;
    remaining = remaining.trim();

    if (opt.type === OPTION_TYPE.USER) {
      const { rest } = takeToken(remaining);
      remaining = rest;
      const user = mentionedUsers[mentionIndex++];
      if (user) values[opt.name] = user;
      return;
    }

    if (!remaining) return;

    if (isLast && opt.type === OPTION_TYPE.STRING) {
      values[opt.name] = stripQuotes(remaining);
      remaining = '';
      return;
    }

    const { value, rest } = takeToken(remaining);
    remaining = rest;

    if (opt.type === OPTION_TYPE.INTEGER) {
      const n = parseInt(value, 10);
      if (!Number.isNaN(n)) values[opt.name] = n;
    } else {
      values[opt.name] = value;
    }
  });

  return values;
}

function buildOptions(values) {
  return {
    getString(name, required) {
      const v = values[name];
      if (v === undefined || v === null || v === '') {
        if (required) throw new Error(`Eksik parametre: **${name}**`);
        return null;
      }
      return String(v);
    },
    getInteger(name, required) {
      const v = values[name];
      if (v === undefined || v === null) {
        if (required) throw new Error(`Eksik veya geçersiz parametre: **${name}**`);
        return null;
      }
      return v;
    },
    getUser(name, required) {
      const v = values[name];
      if (!v) {
        if (required) throw new Error(`Bir kullanıcı etiketlemelisin (**${name}**): örn. @kullanıcı`);
        return null;
      }
      return v;
    },
  };
}

module.exports = { parseOptions, buildOptions, OPTION_TYPE };
