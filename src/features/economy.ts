import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { economy } from "../db/schema.js";

export async function getEconomy(guildId: string, userId: string) {
  const rows = await db
    .select()
    .from(economy)
    .where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
  if (rows[0]) return rows[0];
  await db.insert(economy).values({ guildId, userId }).onConflictDoNothing();
  const fresh = await db
    .select()
    .from(economy)
    .where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
  return fresh[0]!;
}

export async function addBalance(
  guildId: string,
  userId: string,
  amount: number
) {
  await getEconomy(guildId, userId);
  await db
    .update(economy)
    .set({ balance: sql`${economy.balance} + ${amount}` })
    .where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
}

export async function setLastDaily(guildId: string, userId: string, at: Date) {
  await db
    .update(economy)
    .set({ lastDaily: at })
    .where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
}

export async function topRichest(guildId: string, limit = 10) {
  return db
    .select()
    .from(economy)
    .where(eq(economy.guildId, guildId))
    .orderBy(desc(economy.balance))
    .limit(limit);
}
