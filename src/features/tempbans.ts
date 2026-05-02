import type { Client } from "discord.js";
import { eq, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { tempBans } from "../db/schema.js";
import { logger } from "../lib/logger.js";

export function startTempBanLoop(client: Client): void {
  setInterval(async () => {
    try {
      const due = await db.select().from(tempBans).where(lte(tempBans.unbanAt, new Date()));
      for (const ban of due) {
        const guild = client.guilds.cache.get(ban.guildId);
        if (guild) {
          await guild.members.unban(ban.userId, "Temp ban expired").catch(() => {});
        }
        await db.delete(tempBans).where(eq(tempBans.id, ban.id));
      }
    } catch (err) {
      logger.warn({ err }, "TempBan loop error");
    }
  }, 30_000);
}
