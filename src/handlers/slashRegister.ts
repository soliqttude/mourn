import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  REST,
  Routes,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { commands } from "./registry.js";

// Categories whose commands should never be registered as slash commands
const SKIP_CATEGORIES = new Set(["custom", "owner"]);

// Per-category slash command caps — total must stay at or below 100
const CATEGORY_CAPS: Record<string, number> = {
  fun:         21,
  moderation:  20,
  economy:     18,
  utility:     15,
  settings:    10,
  levels:       8,
  giveaway:     3,
  tags:         2,
  voicemaster:  3,
};
// Total: 21+20+18+15+10+8+3+2+3 = 100

function hasUserOption(cmd: { options?: { type: number }[] }): boolean {
  return (cmd.options ?? []).some(
    (o) => o.type === ApplicationCommandOptionType.User || o.type === ApplicationCommandOptionType.Member
  );
}

export async function registerSlashCommands(applicationId: string): Promise<void> {
  // Group eligible commands by category
  const grouped: Record<string, { name: string; description: string; options?: any[]; guildOnly?: boolean }[]> = {};
  for (const cmd of commands.values()) {
    if (SKIP_CATEGORIES.has(cmd.category)) continue;
    if (cmd.noSlash) continue;
    grouped[cmd.category] ??= [];
    grouped[cmd.category].push(cmd);
  }

  // Build the final list: within each category, sort interaction commands (User option) first,
  // then alphabetically — then apply the per-category cap
  const body: RESTPostAPIApplicationCommandsJSONBody[] = [];
  for (const [category, cap] of Object.entries(CATEGORY_CAPS)) {
    const cmds = (grouped[category] ?? [])
      .sort((a, b) => {
        const au = hasUserOption(a) ? 0 : 1;
        const bu = hasUserOption(b) ? 0 : 1;
        if (au !== bu) return au - bu;
        return a.name.localeCompare(b.name);
      })
      .slice(0, cap);

    for (const cmd of cmds) {
      body.push({
        name: cmd.name,
        description: cmd.description.slice(0, 100),
        type: ApplicationCommandType.ChatInput,
        options: (cmd.options as any) ?? [],
        dm_permission: cmd.guildOnly === false,
      });
    }
  }

  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    await rest.put(Routes.applicationCommands(applicationId), { body });
    logger.info(`Registered ${body.length} slash commands globally (capped at 100 across categories).`);
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
