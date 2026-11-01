<div align="center">

# VILLAIN

**One bot. Your entire server.**

A feature-packed Discord bot for moderation, server security, automation, music, leveling, tickets, utilities and community fun.

<p>
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-white?style=for-the-badge" />
</p>

</div>

---

## About

Villain is a hybrid Discord bot built with **discord.js v14**, **TypeScript**, and optional **PostgreSQL** persistence through Drizzle ORM.

Commands are available as both prefix commands and slash commands. The default prefix is `,`.

## Features

| Module | What it includes |
|---|---|
| **Moderation** | Ban, kick, timeout, warn, purge, lock, slowmode, jail, role tools and more |
| **Server security** | Antinuke, antiraid, automod, word filtering, fake permissions and ghost-ping detection |
| **Leveling** | XP tracking, rank cards, leaderboards and reward roles |
| **Music** | Play, queue, skip, filters, seek, volume and playback controls |
| **VoiceMaster** | Temporary voice channels with owner controls and interactive panels |
| **Tickets** | Ticket panels, open/close, claim and transcripts |
| **Giveaways** | Create, edit, end, reroll and cancel giveaways |
| **Server settings** | Welcome/goodbye, logging, autoroles, counters, reaction roles and more |
| **Social** | Profiles, bios, reputation, relationships and social notifications |
| **Utilities** | User/server info, avatars, polls, reminders, embeds, tags and more |
| **Fun** | Games, trivia, memes, image commands and community interactions |
| **Owner tools** | Bot management, diagnostics, broadcast and maintenance controls |

## Requirements

- Node.js **22.12.0 or newer**
- A Discord application and bot token
- PostgreSQL is optional; without `DATABASE_URL`, database-backed features are disabled

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/soliqttude/mourn.git
cd mourn
npm install
```

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|:---:|---|
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `BOT_OWNER_ID` | Yes | Your Discord user ID |
| `DATABASE_URL` | No | PostgreSQL connection string |
| `DEFAULT_PREFIX` | No | Prefix for new servers (default: `,`) |
| `BOT_INVITE_URL` | No | Invite link shown by bot information commands |
| `GUILD_ID` | No | Register slash commands to one test server |
| `LOG_LEVEL` | No | `debug`, `info`, `warn` or `error` |

Never commit your real `.env` file, bot token, database URL or API keys.

### 3. Start Villain

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## Slash commands

Villain registers slash commands on startup. To register manually:

```bash
# Global registration
npm run register

# Register to the GUILD_ID configured in .env
npm run register:guild
```

Global commands can take time to appear. Guild registration is useful while testing.

## Hosting

Villain can run on any Node.js host that supports Node 22.12+.

For Render, use:

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- **Environment:** Add `DISCORD_TOKEN` and `BOT_OWNER_ID`; add `DATABASE_URL` if using PostgreSQL features.

## Project layout

```
src/
├── commands/      # Prefix + slash commands, grouped by category
├── db/            # Drizzle schema, database and migrations
├── events/        # Discord gateway event handlers
├── features/      # Music, tickets, leveling, automod and other systems
├── handlers/      # Command/event loading and slash registration
├── lib/           # Shared command, embed, permission and utility code
├── panels/        # Interactive settings panels
└── index.ts       # Application entry point
```

## Configuration

Optional database settings:

- `ENABLE_DATABASE=false` — disable database access
- `DB_MAX_CONNECTIONS` — PostgreSQL pool size
- `DB_IDLE_TIMEOUT_MS` — idle connection timeout
- `DB_CONNECTION_TIMEOUT_MS` — connection timeout

Optional integrations can be configured with their respective API credentials. Use the bot's integration/status commands to see which integrations are configured.

## Troubleshooting

**The bot exits immediately**  
Check that `DISCORD_TOKEN` and `BOT_OWNER_ID` are present in the host's environment variables.

**Prefix commands do not respond**  
Enable **Message Content Intent** in Discord Developer Portal → Application → Bot → Privileged Gateway Intents.

**Slash commands are missing**  
Wait for global registration to propagate, or set `GUILD_ID` and run `npm run register:guild`.

**Database errors**  
Verify `DATABASE_URL` and ensure the PostgreSQL server accepts connections. Database-backed features require a configured database.

**The build fails**  
Run `npm install`, then `npm run build`, and inspect the first TypeScript error in the logs.

## License

MIT
