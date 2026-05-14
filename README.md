# Mourn built by geico  @udrs on discord

  A feature-rich Discord bot for community and utility server management, built with discord.js v14 and TypeScript.

  ---

  ## Features

  - **Hybrid commands** — every command works as both a slash command and a prefix command
  - **Moderation** — ban, kick, timeout, warn, purge, lock, slowmode, nick, role
  - **Economy** — balance, daily, work, deposit, withdraw, give, leaderboard
  - **Leveling** — XP tracking, level-up announcements, reward roles
  - **Logging** — mod log, message log, join log, voice log
  - **Welcome / Goodbye / Boost** — customizable channel + message templates
  - **Anti-Nuke** — detects mass channel/role deletions and responds automatically
  - **Anti-Raid** — detects join floods and takes action
  - **Auto-Mod** — link filter, invite filter
  - **Reaction Roles** — add/remove roles on emoji reactions
  - **Starboard** — auto-pins messages that hit a reaction threshold
  - **Voicemaster** — users create and manage their own voice channels
  - **Tickets** — ticket panels with open/close/claim support
  - **AFK** — away status with automatic restore
  - **Snipe / Editsnipe** — recall recently deleted or edited messages
  - **Tags** — custom per-server text commands
  - **Auto-Responders** — keyword-triggered auto-replies
  - **Reminders** — timed DM reminders
  - **Control Panel** — `/panel` command with tabbed embed dashboard

  ---

  ## Requirements

  - Node.js 20+
  - PostgreSQL database (Railway, Supabase, Neon, or local)

  ---

  ## Installation

  ```bash
  git clone https://github.com/youruser/mourn-bot.git
  cd mourn-bot
  npm install
  ```

  ---

  ## Configuration

  1. Copy the example environment file:

  ```bash
  cp .env.example .env
  ```

  2. Fill in your values in `.env`:

  | Variable | Required | Description |
  |---|---|---|
  | `DISCORD_TOKEN` | ✅ | Bot token from the [Discord Developer Portal](https://discord.com/developers/applications) |
  | `BOT_OWNER_ID` | ✅ | Your Discord user ID (Developer Mode → right-click your name) |
  | `DATABASE_URL` | ✅ | PostgreSQL connection string |
  | `DEFAULT_PREFIX` | optional | Command prefix (default: `,`) |
  | `LOG_LEVEL` | optional | `debug` / `info` / `warn` / `error` (default: `info`) |
  | `BOT_INVITE_URL` | optional | Invite link shown in `,about` |
  | `GUILD_ID` | optional | Set this to register slash commands to one server instantly (dev only) |

  ---

  ## Running the Bot

  ### Development (auto-restart on file change)

  ```bash
  npm run dev
  ```

  ### Production (compile then start)

  ```bash
  npm run build
  npm start
  ```

  ---

  ## Deploying Slash Commands

  Slash commands are **registered automatically on startup** (globally). If you want to force a manual registration:

  ### Register globally (takes up to 1 hour to propagate)

  ```bash
  npm run register
  ```

  ### Register to a specific server instantly (development)

  Set `GUILD_ID=your_server_id` in `.env`, then:

  ```bash
  npm run register:guild
  ```

  ---

  ## Command Prefix

  The default prefix is `,` — change it with:

  ```
  ,prefix set !
  ```

  Or update `DEFAULT_PREFIX` in `.env` before first run.

  ---

  ## Project Structure

  ```
  mourn-bot/
  ├── src/
  │   ├── commands/           # Hybrid commands by category
  │   │   ├── custom/         # Server-specific custom commands
  │   │   ├── economy/        # Balance, daily, work, etc.
  │   │   ├── levels/         # Rank, leaderboard
  │   │   ├── moderation/     # Ban, kick, warn, purge, etc.
  │   │   ├── owner/          # Bot-owner-only commands
  │   │   ├── settings/       # Server configuration
  │   │   ├── tags/           # Tags and auto-responders
  │   │   ├── utility/        # Help, ping, userinfo, etc.
  │   │   └── voicemaster/    # Voice channel management
  │   ├── db/
  │   │   ├── index.ts        # Drizzle + pg pool
  │   │   ├── migrate.ts      # Inline SQL migration runner
  │   │   ├── schema.ts       # Drizzle ORM table definitions
  │   │   └── settings.ts     # Guild settings cache helpers
  │   ├── events/             # Discord.js event handlers
  │   ├── features/           # Standalone feature modules
  │   ├── handlers/
  │   │   ├── events.ts       # Event loader
  │   │   ├── registry.ts     # Command loader + collection
  │   │   └── slashRegister.ts# On-ready slash command registration
  │   ├── lib/
  │   │   ├── command.ts      # HybridCommand + CommandContext types
  │   │   ├── contextFactory.ts # Slash / prefix context builders
  │   │   ├── embeds.ts       # Embed builder helpers
  │   │   ├── logger.ts       # Pino logger
  │   │   ├── parsing.ts      # Arg parsing, member/role resolution
  │   │   ├── permissions.ts  # Permission tier checks
  │   │   ├── template.ts     # Welcome/goodbye message templating
  │   │   └── time.ts         # Duration parsing and formatting
  │   ├── panels/
  │   │   └── router.ts       # /panel tab router + interaction handler
  │   ├── scripts/
  │   │   └── register.ts     # Standalone slash command registration script
  │   └── index.ts            # Bot entry point
  ├── .env.example
  ├── .gitignore
  ├── drizzle.config.ts
  ├── package.json
  ├── README.md
  └── tsconfig.json
  ```

  ---

  ## Troubleshooting

  **Bot doesn't start — "Missing required environment variable"**
  → Check your `.env` file. All three of `DISCORD_TOKEN`, `BOT_OWNER_ID`, and `DATABASE_URL` must be set.

  **Slash commands not appearing**
  → Global commands take up to 1 hour to propagate. Set `GUILD_ID` in `.env` and run `npm run register:guild` for instant registration in your test server.

  **Database connection errors**
  → Verify your `DATABASE_URL` is correct. If using Railway, copy the connection string from the Postgres plugin. Tables are created automatically on first startup.

  **"Cannot find module" on startup**
  → Run `npm install` first. If using the compiled version (`npm start`), run `npm run build` first.

  **Prefix commands not responding**
  → Make sure Message Content Intent is enabled in the [Discord Developer Portal](https://discord.com/developers/applications) under your bot's settings → Privileged Gateway Intents.

  **Intents error on login**
  → In the Developer Portal, enable all three Privileged Gateway Intents: Presence Intent, Server Members Intent, and Message Content Intent.

  ---

  ## License

  MIT
  
