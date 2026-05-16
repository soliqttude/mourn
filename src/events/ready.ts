import type { Client } from "discord.js";
import { logger } from "../lib/logger.js";
import { cacheGuildInvites } from "../features/invites.js";
import { checkBirthdays } from "../features/birthday.js";

export const event = {
  name: "ready",
  once: false,
  async execute(client: Client) {
    logger.info(`Bleed is online as ${client.user?.tag}`);
    for (const [, guild] of client.guilds.cache) {
      try {
        await cacheGuildInvites(guild);
      } catch (err) {
        logger.warn({ err, guildId: guild.id }, "Failed initial invite cache");
      }
    }
    setInterval(async () => {
      try {
        await checkBirthdays(client);
      } catch (err) {
        logger.error({ err }, "Birthday check error");
      }
    }, 60 * 60 * 1000);
    try { await checkBirthdays(client); } catch {}
  },
};
