import { eq } from "drizzle-orm";
import type { Client, Message } from "discord.js";
import { db } from "../db/index.js";
import { autoresponders } from "../db/schema.js";

export async function addAutoresponder(
  guildId: string,
  trigger: string,
  response: string,
  matchType: "contains" | "exact" | "starts" = "contains",
  createdBy = "unknown"
) {
  await db
    .insert(autoresponders)
    .values({ guildId, trigger: trigger.toLowerCase(), response, matchType, createdBy });
}

export async function removeAutoresponder(id: number) {
  const rows = await db
    .delete(autoresponders)
    .where(eq(autoresponders.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function listAutoresponders(guildId: string) {
  return db.select().from(autoresponders).where(eq(autoresponders.guildId, guildId));
}

export async function handleAutoresponders(client: Client, message: Message) {
  if (!message.guild || message.author.bot) return;
  const list = await listAutoresponders(message.guild.id);
  if (list.length === 0) return;
  const lower = message.content.toLowerCase();
  for (const ar of list) {
    let match = false;
    if (ar.matchType === "exact") match = lower === ar.trigger;
    else if (ar.matchType === "starts") match = lower.startsWith(ar.trigger);
    else match = lower.includes(ar.trigger);
    if (match) {
      await message.reply({ content: ar.response, allowedMentions: { parse: [] } }).catch(() => {});
      break;
    }
  }
}
