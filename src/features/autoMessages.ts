import { type Client, type GuildTextBasedChannel } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { autoMessages } from "../db/schema.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { parseScript } from "../lib/scripting.js";

export function startAutoMessageLoop(client: Client): void {
  if (!config.databaseEnabled) {
    logger.warn("Database is disabled; auto messages are unavailable.");
    return;
  }

  setInterval(async () => {
    try {
      const now = new Date();
      const all = await db.select().from(autoMessages);

      for (const am of all) {
        const last = am.lastSentAt ? am.lastSentAt.getTime() : 0;
        if (now.getTime() - last < am.intervalMs) continue;

        const channel = client.channels.cache.get(am.channelId);
        if (!channel?.isTextBased() || !("send" in channel) || !("guild" in channel)) continue;

        const parsed = parseScript(am.message, {
          guild: channel.guild,
          channel: channel as unknown as import("discord.js").TextChannel,
          client,
        });

        const sent = await (channel as GuildTextBasedChannel).send({
          content: parsed.content || undefined,
          embeds: parsed.embeds.length ? parsed.embeds : undefined,
          components: parsed.components.length ? parsed.components : undefined,
        }).catch(() => null);

        if (!sent) continue;

        await db.update(autoMessages)
          .set({ lastSentAt: now })
          .where(eq(autoMessages.id, am.id))
          .catch((err) => logger.warn({ err, timerId: am.id }, "auto message timestamp update failed"));
      }
    } catch (err) {
      logger.warn({ err }, "auto messages loop error");
    }
  }, 30_000);
}
