# ercü-bot

A fun Discord bot with memes, mini-games/economy, and moderation utilities, built with discord.js v14 and SQLite. Commands are triggered with a text prefix (default `!`), not Discord's native slash-command UI.

## Features

- **Meme:** `!meme`, `!caption`
- **Moderation/Utility:** `!kick`, `!ban`, `!warn`, `!warnings`, `!purge`, `!poll`, `!remind`, `!ping`, `!userinfo`, `!serverinfo`, `!help`
- **Games/Economy:** `!balance`, `!daily`, `!work`, `!slots`, `!blackjack`, `!trivia`, `!leaderboard`
- Welcome messages on member join (if `WELCOME_CHANNEL_ID` is set)

Run `!help` in your server for the full list with usage syntax. Arguments are positional: tag users with `@`, wrap multi-word text in `"quotes"` when it's not the last argument (e.g. `!warn @user "being disruptive"`); the last text argument (like a `!poll` option or `!remind` message) can skip quotes and just be the rest of the message.

## 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, create a bot user, copy the **token** (this is `DISCORD_TOKEN`).
3. Under **Bot → Privileged Gateway Intents**, enable **Server Members Intent** (welcome messages, member lookups) and **Message Content Intent** (required to read prefix commands like `!meme`).
4. Under **OAuth2 → General**, copy the **Application ID** (this is `CLIENT_ID`, kept for reference/future use).
5. Under **OAuth2 → URL Generator**, select scope `bot` (no need for `applications.commands` since there are no slash commands), and permissions: Kick Members, Ban Members, Moderate Members, Manage Messages, Send Messages, Embed Links, Attach Files, Add Reactions, Read Message History. Use the generated URL to invite the bot to your server.
6. Copy your server's ID (enable Developer Mode in Discord, right-click your server icon → Copy Server ID) — this is `GUILD_ID`.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-id
GUILD_ID=your-server-id
WELCOME_CHANNEL_ID=          # optional, channel ID for welcome messages
MOD_ROLE_ID=                 # optional, role ID that also counts as a moderator
PREFIX=!                     # command prefix
```

## 3. Run locally (before deploying)

`better-sqlite3` and `canvas` are native modules — they need Python + a C++ toolchain to build from source if no prebuilt binary matches your Node version. The easiest path on Windows is to test with Docker directly (it already has everything it needs, see step 4) instead of running bare `node` on the host:

```bash
docker compose build
docker compose up
```

If you'd rather run it directly with plain Node (Linux/macOS, or Windows with Python 3 + Visual Studio Build Tools installed):

```bash
npm install
npm start   # or: node src/index.js
```

Confirm the bot logs in and shows "Logged in as ..." in the console, and appears Online in your server. Test each command category live in Discord: `!ping`, `!meme`, `!daily`, `!slots 50`, `!blackjack 50`, `!trivia`, `!warn @user reason`, `!purge 10`, `!poll "question" "a" "b"`, `!remind 10m message`, `!help`, etc.

## 4. Deploy on your VPS with Docker

The VPS already has Docker, docker-compose, and nginx — this bot doesn't need nginx or any exposed port, since it only makes outbound connections to Discord's gateway.

```bash
# on the VPS, inside the project directory (after copying the repo + your real .env there)
docker-compose up -d --build
docker-compose logs -f bot        # confirm clean startup
```

The SQLite database (`/app/data/bot.sqlite`) lives on the named `bot-data` Docker volume, so balances/warnings/reminders survive container rebuilds (`docker-compose up --build`) and VPS reboots. `restart: always` keeps the bot running through crashes and reboots.

To update the bot after code changes:

```bash
git pull   # or re-upload files
docker-compose up -d --build
```

## Notes

- Never commit `.env` — it's already gitignored.
- If the Alpine-based Docker build for `canvas` (used by `!caption`) is slow or fails on your VPS, switch the Dockerfile's base image to `node:20-bookworm-slim` and replace the `apk add` line with `apt-get install -y python3 make g++ libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`.
- Ephemeral (private) replies don't exist for prefix commands — every reply is a normal, visible channel message.
