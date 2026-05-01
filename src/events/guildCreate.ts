import type { Client, Guild } from "discord.js";
import { logger } from "../lib/logger.js";
import { cacheGuildInvites } from "../features/invites.js";

export const event = {
  name: "guildCreate",
  async execute(client: Client, guild: Guild) {
    logger.info(`Joined guild ${guild.name} (${guild.id})`);
    try {
      await cacheGuildInvites(guild);
    } catch (err) {
      logger.warn({ err }, "Failed to cache invites for new guild");
    }
  },
};
