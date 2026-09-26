import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { economy, reputation } from "../db/schema.js";

export type EconomyBalance = {
  balance: number;
  bank: number;
  lastDaily: Date | null;
};

export async function getBalance(guildId: string, userId: string): Promise<EconomyBalance> {
  const row = await db.select().from(economy).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId))).then(r => r[0]);
  return { balance: row?.balance ?? 0, bank: row?.bank ?? 0, lastDaily: row?.lastDaily ?? null };
}

export async function getEconomy(guildId: string, userId: string) {
  const row = await db.select().from(economy).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId))).then(r => r[0]);
  return {
    balance: row?.balance ?? 0,
    bank: row?.bank ?? 0,
    streak: 0,
    prestige: 0,
  };
}

async function ensure(guildId: string, userId: string) {
  await db.insert(economy).values({ guildId, userId, balance: 0, bank: 0 }).onConflictDoNothing();
}

export async function addBalance(guildId: string, userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return getBalance(guildId, userId);
  await ensure(guildId, userId);
  await db.update(economy).set({ balance: sql`${economy.balance} + ${Math.floor(amount)}` })
    .where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
  return getBalance(guildId, userId);
}

export async function removeBalance(guildId: string, userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return getBalance(guildId, userId);
  await ensure(guildId, userId);
  await db.update(economy).set({ balance: sql`GREATEST(0, ${economy.balance} - ${Math.floor(amount)})` })
    .where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
  return getBalance(guildId, userId);
}

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

export async function getAllActiveBuffs(_guildId: string, _userId: string): Promise<Array<{ buffType: string; expiresAt: Date }>> {
  return [];
}
