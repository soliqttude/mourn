/**
   * Standalone script to register slash commands with Discord.
   * Run: npm run register
   * This registers commands globally (may take up to 1 hour to propagate).
   * For instant testing in one guild: set GUILD_ID in .env and adjust the route.
   */

  import "dotenv/config";
  import {
    REST,
    Routes,
    ApplicationCommandType,
  } from "discord.js";
  import { readdirSync, statSync } from "node:fs";
  import { join, dirname } from "node:path";
  import { fileURLToPath, pathToFileURL } from "node:url";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.GUILD_ID; // optional — for instant per-guild registration

  if (!token) {
    console.error("❌ DISCORD_TOKEN is not set in your .env file.");
    process.exit(1);
  }

  async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) {
        out.push(...(await walk(p)));
      } else if ((entry.endsWith(".js") || entry.endsWith(".ts")) && !entry.endsWith(".d.ts")) {
        out.push(p);
      }
    }
    return out;
  }

  const commandsDir = join(__dirname, "..", "commands");
  const files = await walk(commandsDir);

  const body: any[] = [];
  let loaded = 0;

  for (const file of files) {
    try {
      const url = pathToFileURL(file).href;
      const mod = await import(url);
      const cmd = mod.command ?? mod.default;
      if (!cmd?.name || !cmd.execute) continue;
      body.push({
        name: cmd.name,
        description: (cmd.description ?? "No description").slice(0, 100),
        type: ApplicationCommandType.ChatInput,
        options: cmd.options ?? [],
        dm_permission: cmd.guildOnly === false,
      });
      loaded++;
    } catch (err) {
      console.warn(`⚠️  Failed to load ${file}: ${(err as Error).message}`);
    }
  }

  console.log(`📦 Loaded ${loaded} commands. Registering…`);

  const rest = new REST({ version: "10" }).setToken(token!);

  try {
    // Fetch application ID from Discord
    const app = await rest.get(Routes.oauth2CurrentApplication()) as any;
    const applicationId = app.id as string;

    if (guildId) {
      // Guild-specific (instant, for development)
      await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body });
      console.log(`✅ Registered ${body.length} slash commands to guild ${guildId} (instant).`);
    } else {
      // Global (takes up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(applicationId), { body });
      console.log(`✅ Registered ${body.length} slash commands globally.`);
      console.log("⏳ Global commands can take up to 1 hour to appear. Use GUILD_ID for instant dev registration.");
    }
  } catch (err) {
    console.error("❌ Failed to register slash commands:", (err as Error).message);
    process.exit(1);
  }
  