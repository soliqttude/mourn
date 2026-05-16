import { type Client, type TextChannel } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { autoMessages } from "../db/schema.js";
import { logger } from "../lib/logger.js";
import { parseScript } from "../lib/scripting.js";

export function startAutoMessageLoop(client: Client): void {
  setInterval(async () => {
    try {
      const now = new Date();
      const all = await db.select().from(autoMessages);
      for (const am of all) {
        const last = am.lastSentAt ? am.lastSentAt.getTime() : 0;
        if (now.getTime() - last < am.intervalMs) continue;

        const ch = client.channels.cache.get(am.channelId) as TextChannel | undefined;
        if (!ch) continue;

        const { embed, content } = parseScript(am.message);
        await ch.send({ content, embeds: embed ? [embed] : [] }).catch(() => {});
        await db.update(autoMessages).set({ lastSentAt: now }).where(eq(autoMessages.id, am.id));
      }
    } catch (err) {
      logger.warn({ err }, "auto messages loop error");
    }
  }, 30_000);
}
