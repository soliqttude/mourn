import { and, eq, sql } from "drizzle-orm";
import type { Client, Message } from "discord.js";
import { db } from "../db/index.js";
import { tags } from "../db/schema.js";

export async function addTag(
  guildId: string,
  name: string,
  response: string,
  createdBy: string
) {
  await db
    .insert(tags)
    .values({ guildId, name: name.toLowerCase(), response, createdBy })
    .onConflictDoUpdate({
      target: [tags.guildId, tags.name],
      set: { response, createdBy },
    });
}

export async function removeTag(guildId: string, name: string) {
  const rows = await db
    .delete(tags)
    .where(and(eq(tags.guildId, guildId), eq(tags.name, name.toLowerCase())))
    .returning();
  return rows[0] ?? null;
}

export async function listTags(guildId: string) {
  return db.select().from(tags).where(eq(tags.guildId, guildId));
}

export async function getTag(guildId: string, name: string) {
  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.guildId, guildId), eq(tags.name, name.toLowerCase())));
  return rows[0] ?? null;
}

export async function handleTags(
  client: Client,
  message: Message,
  name: string
): Promise<boolean> {
  if (!message.guild) return false;
  const tag = await getTag(message.guild.id, name);
  if (!tag) return false;
  await db
    .update(tags)
    .set({ uses: sql`${tags.uses} + 1` })
    .where(and(eq(tags.guildId, message.guild.id), eq(tags.name, tag.name)));
  await message
    .reply({ content: tag.response, allowedMentions: { parse: [] } })
    .catch(() => {});
  return true;
}
