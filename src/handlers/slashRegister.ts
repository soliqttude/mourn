import {
  ApplicationCommandType,
  REST,
  Routes,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { commands } from "./registry.js";

export async function registerSlashCommands(applicationId: string): Promise<void> {
  const body: RESTPostAPIApplicationCommandsJSONBody[] = [];
  for (const cmd of commands.values()) {
    body.push({
      name: cmd.name,
      description: cmd.description.slice(0, 100),
      type: ApplicationCommandType.ChatInput,
      options: (cmd.options as any) ?? [],
      dm_permission: cmd.guildOnly === false,
    });
  }
  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    await rest.put(Routes.applicationCommands(applicationId), { body });
    logger.info(`Registered ${body.length} slash commands globally.`);
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
