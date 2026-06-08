<div align="center">
  <h1>bleed</h1>
  <p>A powerful, feature-rich Discord bot built for community servers — hybrid prefix + slash commands out of the box.</p>
  <p>
    <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/PostgreSQL-Drizzle-336791?style=flat-square&logo=postgresql&logoColor=white" />
    <img src="https://img.shields.io/badge/deployed-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white" />
  </p>
</div>

---

## Overview

bleed is a hybrid Discord bot — every command works as both a **slash command** and a **prefix command** (default prefix: `,`). Built on discord.js v14, TypeScript, and PostgreSQL via Drizzle ORM.

---

## Features

| Category | Highlights |
|---|---|
| **Moderation** | ban, kick, timeout, warn, purge, lock, slowmode, hardban, massban, jail, hackban, nuke, raidmode, and more |
| **Security** | antinuke, antiraid, automod, word filter, fake permissions, ghost ping detection |
| **Leveling** | XP tracking, level-up messages, reward roles, leaderboard, XP management |
| **Music** | play, skip, queue, now playing, volume, filters, seek (DisTube) |
| **VoiceMaster** | user-owned voice channels with full 10-button control panel (lock, unlock, ghost, reveal, claim, disconnect, activity, info, +/- limit) |
| **Tickets** | panels with open/close/claim/transcript support |
| **Giveaways** | create, end, reroll, edit, cancel |
| **Settings** | welcome, goodbye, boost messages, logging, autorole, starboard, counters, reaction roles |
| **Utility** | userinfo, serverinfo, avatar, remind, poll, snipe, embed builder, tags, autoresponders |
| **Last.fm** | now playing, top artists, top tracks, top albums, profile |
| **Fun** | 100+ commands — trivia, blackjack, hangman, ship, marry, and more |
| **Owner** | broadcast, blacklist, eval, puppet, ghost, masquerade, and more |

---

## Requirements

- **Node.js** 20+
- **PostgreSQL** database (Railway, Supabase, Neon, or local)

--- best free bot fr

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
| `GUILD_ID` | optional | Instantly register slash commands to one server (dev only) |

### 3. Run

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

---

## Slash Command Registration

Slash commands register automatically on startup. To register manually:

```bash
# Global (up to 1 hour to propagate)
npm run register

# Instant — one server (set GUILD_ID in .env first)
npm run register:guild
```

---

## Project Structure

```
src/
├── commands/        # Hybrid commands grouped by category
│   ├── custom/
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
│   ├── migrate.ts       # Migration runner
│   └── settings.ts      # Guild settings cache
├── events/              # Discord.js event handlers
├── features/            # Feature modules (music, leveling, automod, voicemaster…)
├── handlers/
│   ├── registry.ts      # Command loader
│   ├── events.ts        # Event loader
│   └── slashRegister.ts # Slash command registration
├── lib/
│   ├── command.ts       # HybridCommand + CommandContext types
│   ├── contextFactory.ts
│   ├── embeds.ts        # Embed helpers
│   ├── logger.ts        # Pino logger
│   ├── permissions.ts   # Permission tier checks
│   └── time.ts
├── panels/
│   └── router.ts        # Interactive settings panel
└── index.ts             # Entry point
```

---

## Troubleshooting

**Bot won't start**
→ Make sure `DISCORD_TOKEN`, `BOT_OWNER_ID`, and `DATABASE_URL` are all set in `.env`.

**Slash commands not appearing**
→ Global commands take up to 1 hour. Use `GUILD_ID` + `npm run register:guild` for instant dev registration.

**Database errors on startup**
→ Check your `DATABASE_URL`. Tables are created automatically via Drizzle migrations on first boot.

**Prefix commands not working**
→ Enable **Message Content Intent** in the [Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents.

**VoiceMaster panel only shows 5 buttons**
→ Fixed in latest commit. Pull latest and redeploy.

**"Cannot find module" errors**
→ Run `npm install`. If using `npm start`, run `npm run build` first.

---

## License

MIT
