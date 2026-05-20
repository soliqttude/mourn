import { type Client, ChannelType } from "discord.js";
import { db } from "../db/index.js";
import { counters } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function updateCounters(client: Client) {
  for (const [, guild] of client.guilds.cache) {
    try {
      const rows = await db.select().from(counters).where(eq(counters.guildId, guild.id));
      if (!rows.length) continue;

      let memberCount = guild.memberCount;
      let botCount = 0;
      try {
        const members = await guild.members.fetch();
        memberCount = members.size;
        botCount = members.filter(m => m.user.bot).size;
      } catch {
        botCount = guild.members.cache.filter(m => m.user.bot).size;
      }

      const humanCount = memberCount - botCount;

      const values: Record<string, number> = {
        members:  memberCount,
        humans:   humanCount,
        bots:     botCount,
        channels: guild.channels.cache.size,
        roles:    Math.max(0, guild.roles.cache.size - 1),
        boosts:   guild.premiumSubscriptionCount ?? 0,
      };

      for (const counter of rows) {
        const value = values[counter.type];
        if (value === undefined) continue;
        const name = counter.template.replace("{count}", String(value));
        const channel = guild.channels.cache.get(counter.channelId);
        if (!channel) continue;
        if (channel.name === name) continue;
        await channel.setName(name).catch(err => {
          logger.warn({ err, channelId: counter.channelId }, "counter channel name update failed");
        });
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      logger.error({ err, guildId: guild.id }, "counter update error");
    }
  }
}
