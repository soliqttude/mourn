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

// These commands are always registered first in their category,
// guaranteeing they make the cut no matter how many commands exist.
const PINNED_COMMANDS = new Set([
  "help",
  "ping",
  "serverinfo",
  "userinfo",
  "membercount",
  "avatar",
]);

// Per-category slash command caps — total must stay at or below 100
const CATEGORY_CAPS: Record<string, number> = {
  fun:         21,
  moderation:  20,
  utility:     15,
  settings:    10,
  levels:       8,
  giveaway:     3,
  tags:         2,
  voicemaster:  3,
};
// Total: 21+20+15+10+8+3+2+3 = 82  (≤100 limit)

function hasUserOption(cmd: { options?: { type: number }[] }): boolean {
  return (cmd.options ?? []).some(
    (o) =>
      o.type === ApplicationCommandOptionType.User,
  );
}

function sortPriority(cmd: { name: string; options?: { type: number }[] }): number {
  if (PINNED_COMMANDS.has(cmd.name)) return 0;
  if (hasUserOption(cmd)) return 1;
  return 2;
}

export async function registerSlashCommands(applicationId: string): Promise<void> {
  // Group eligible commands by category
  const grouped: Record<
    string,
    { name: string; description: string; options?: any[]; guildOnly?: boolean }[]
  > = {};

  for (const cmd of commands.values()) {
    if (SKIP_CATEGORIES.has(cmd.category)) continue;
    if (cmd.noSlash) continue;
    grouped[cmd.category] ??= [];
    grouped[cmd.category].push(cmd);
  }

  // Build final list: pinned first → user-option commands → alphabetical → cap
  const body: RESTPostAPIApplicationCommandsJSONBody[] = [];

  for (const [category, cap] of Object.entries(CATEGORY_CAPS)) {
    const cmds = (grouped[category] ?? [])
      .sort((a, b) => {
        const pa = sortPriority(a);
        const pb = sortPriority(b);
        if (pa !== pb) return pa - pb;
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
    logger.info(
      `Registered ${body.length} slash commands globally (pinned: ${[...PINNED_COMMANDS].join(", ")}).`,
    );
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
