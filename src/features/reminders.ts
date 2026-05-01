import type { Client, TextChannel } from "discord.js";
import { eq, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { remindersTable } from "../db/schema.js";
import { logger } from "../lib/logger.js";

export async function addReminder(
  userId: string,
  channelId: string,
  guildId: string | null,
  message: string,
  remindAt: Date
) {
  await db.insert(remindersTable).values({
    userId,
    channelId,
    guildId,
    message,
    remindAt,
  });
}

export function startReminderLoop(client: Client) {
  setInterval(async () => {
    try {
      const due = await db
        .select()
        .from(remindersTable)
        .where(lte(remindersTable.remindAt, new Date()));
      for (const r of due) {
        const ch = await client.channels.fetch(r.channelId).catch(() => null);
        if (ch && "send" in ch) {
          await (ch as TextChannel)
            .send({
              content: `⏰ <@${r.userId}>, reminder: ${r.message}`,
              allowedMentions: { users: [r.userId] },
            })
            .catch(() => {});
        }
        await db
          .delete(remindersTable)
          .where(eq(remindersTable.id, r.id))
          .catch(() => {});
      }
    } catch (err) {
      logger.warn({ err }, "Reminder loop error");
    }
  }, 30_000);
}
