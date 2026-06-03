<div align="center">
  <h1>mourn</h1>
  <p>A feature-rich Discord bot for community and server management.</p>
  <p>
    <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/PostgreSQL-Drizzle-336791?style=flat-square&logo=postgresql&logoColor=white" />
    <img src="https://img.shields.io/badge/deployed-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white" />
  </p>
</div>

---

## Overview

mourn is a hybrid Discord bot — every command works as both a **slash command** and a **prefix command** (default prefix: `,`). Built with discord.js v14, TypeScript, and PostgreSQL via Drizzle ORM.

---

## Features

| Category | Commands |
|---|---|
| **Moderation** | ban, kick, timeout, warn, purge, lock, slowmode, hardban, massban, jail, hackban, and more |
| **Security** | antinuke, antiraid, automod, word filter, fake permissions, raid mode |
| **Leveling** | XP tracking, level-up messages, reward roles, leaderboard |
| **Economy** | balance, daily, work, shop, give, leaderboard |
| **Music** | play, skip, queue, nowplaying, volume, filter, seek (via DisTube) |
| **Settings** | welcome, goodbye, boost messages, logging, autorole, starboard, counters |
| **Utility** | userinfo, serverinfo, avatar, remind, poll, snipe, embed builder, tags |
| **Tickets** | ticket panels with open/close/claim/transcript support |
| **Giveaways** | create, end, reroll, edit, cancel |
| **VoiceMaster** | user-created voice channels with full control panel |
| **Last.fm** | now playing, top artists, top tracks, top albums |
| **Fun** | 100+ fun and social commands |

---

## Requirements

- **Node.js** 20+
- **PostgreSQL** database (Railway, Supabase, Neon, or local)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/soliqttude/mournbot.git
cd mournbot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from the [Developer Portal](https://discord.com/developers/applications) |
| `BOT_OWNER_ID` | ✅ | Your Discord user ID |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DEFAULT_PREFIX` | optional | Command prefix (default: `,`) |
| `LOG_LEVEL` | optional | `debug` / `info` / `warn` / `error` |
| `BOT_INVITE_URL` | optional | Invite link shown in `,about` |
| `GUILD_ID` | optional | Register slash commands to one server instantly (dev only) |

### 3. Run

```bash
# Development (hot reload via tsx)
npm run dev

# Production
npm run build
npm start
```

---

## Slash Command Registration

Slash commands are registered automatically on startup. To register manually:

```bash
# Global (up to 1 hour to propagate)
npm run register

# Instant — one specific server (dev)
# Set GUILD_ID in .env first, then:
npm run register:guild
```

---

## Project Structure

```
src/
├── commands/        # Hybrid commands grouped by category
│   ├── fun/
│   ├── giveaway/
│   ├── lastfm/
│   ├── levels/
│   ├── moderation/
│   ├── music/
│   ├── owner/
│   ├── settings/
│   ├── social/
│   ├── tags/
│   ├── utility/
│   └── voicemaster/
├── db/
│   ├── index.ts         # Drizzle + pg pool
│   ├── schema.ts        # Table definitions
│   └── settings.ts      # Guild settings cache
├── events/              # Discord.js event handlers
├── features/            # Standalone feature modules (music, leveling, automod…)
├── handlers/
│   ├── registry.ts      # Command loader + collection
│   ├── events.ts        # Event loader
│   └── slashRegister.ts # On-ready slash registration
├── lib/
│   ├── command.ts       # HybridCommand + CommandContext types
│   ├── contextFactory.ts
│   ├── embeds.ts
│   ├── logger.ts        # Pino logger
│   ├── parsing.ts
│   ├── permissions.ts   # Permission tier checks
│   └── time.ts
└── index.ts             # Entry point
```

---

## Troubleshooting

**Bot won't start — missing environment variable**
→ Ensure `DISCORD_TOKEN`, `BOT_OWNER_ID`, and `DATABASE_URL` are all set in `.env`.

**Slash commands not showing up**
→ Global commands take up to 1 hour. Use `GUILD_ID` + `npm run register:guild` for instant dev registration.

**Database errors on startup**
→ Check your `DATABASE_URL`. Tables are created automatically on first boot via Drizzle migrations.

**Prefix commands not responding**
→ Enable **Message Content Intent** in the [Developer Portal](https://discord.com/developers/applications) → your app → Bot → Privileged Gateway Intents.

**"Cannot find module" errors**
→ Run `npm install`. If using `npm start`, run `npm run build` first.

---

## License

MIT
