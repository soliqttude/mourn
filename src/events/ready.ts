import type { Client } from "discord.js";
import { logger } from "../lib/logger.js";
import { cacheGuildInvites } from "../features/invites.js";

export const event = {
  name: "ready",
  once: false,
  async execute(client: Client) {
    for (const [, guild] of client.guilds.cache) {
      try {
        await cacheGuildInvites(guild);
      } catch (err) {
        logger.warn({ err, guildId: guild.id }, "Failed initial invite cache");
      }
    }
  },
};
