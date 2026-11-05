import type { Client } from "discord.js";
import { and, lte, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { tempRoles } from "../db/schema.js";
import { logger } from "../lib/logger.js";

export function startTempRoleLoop(client: Client): void {
  setInterval(async () => {
    try {
      const due = await db.select().from(tempRoles).where(lte(tempRoles.expiresAt, new Date()));
      for (const entry of due) {
        const guild = client.guilds.cache.get(entry.guildId);
        if (guild) {
          const member = await guild.members.fetch(entry.userId).catch(() => null);
          const role = guild.roles.cache.get(entry.roleId);
          if (member && role && member.roles.cache.has(role.id)) {
            await member.roles.remove(role, "Temporary role expired").catch((err) => {
              logger.warn({ err, guildId: entry.guildId, userId: entry.userId, roleId: entry.roleId }, "Failed to remove expired temporary role");
            });
          }
        }
        await db.delete(tempRoles).where(eq(tempRoles.id, entry.id));
      }
    } catch (err) {
      logger.warn({ err }, "Temporary role expiry loop error");
    }
  }, 30_000);
}
