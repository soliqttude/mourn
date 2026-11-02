import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { reputation } from "../db/schema.js";

export async function getRep(guildId: string, userId: string) {
  const row = await db.select().from(reputation).where(and(eq(reputation.guildId, guildId), eq(reputation.userId, userId))).then(r => r[0]);
  return { repCount: row?.repCount ?? 0 };
}

export async function giveRep(guildId: string, giverId: string, targetId: string) {
  const existing = await db.select().from(reputation)
    .where(and(eq(reputation.guildId, guildId), eq(reputation.userId, giverId))).then(r => r[0]);
  if (existing?.lastGivenAt && Date.now() - existing.lastGivenAt.getTime() < 86_400_000) {
    return { success: false, reason: "you can only give rep once every 24 hours." };
  }
  await db.insert(reputation).values({ guildId, userId: targetId, repCount: 1 })
    .onConflictDoUpdate({ target: [reputation.guildId, reputation.userId], set: { repCount: sql`${reputation.repCount} + 1` } });
  await db.insert(reputation).values({ guildId, userId: giverId, repCount: 0, lastGivenAt: new Date() })
    .onConflictDoUpdate({ target: [reputation.guildId, reputation.userId], set: { lastGivenAt: new Date() } });
  return { success: true };
}
