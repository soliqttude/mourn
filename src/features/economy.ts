import { and, eq, desc, sql, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { economy, userRep, activeBuffs } from "../db/schema.js";

export async function getEconomy(guildId: string, userId: string) {
  const rows = await db.select().from(economy).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
  if (rows[0]) return rows[0];
  await db.insert(economy).values({ guildId, userId }).onConflictDoNothing();
  const fresh = await db.select().from(economy).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
  return fresh[0]!;
}

export async function getBalance(guildId: string, userId: string) {
  return getEconomy(guildId, userId);
}

export async function addBalance(guildId: string, userId: string, amount: number) {
  await getEconomy(guildId, userId);
  await db.update(economy).set({ balance: sql`${economy.balance} + ${amount}` }).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
}

export async function removeBalance(guildId: string, userId: string, amount: number) {
  await getEconomy(guildId, userId);
  await db.update(economy).set({ balance: sql`GREATEST(0, ${economy.balance} - ${amount})` }).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
}

export async function addBankBalance(guildId: string, userId: string, amount: number) {
  await getEconomy(guildId, userId);
  await db.update(economy).set({ bank: sql`${economy.bank} + ${amount}` }).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
}

export async function removeBankBalance(guildId: string, userId: string, amount: number) {
  await getEconomy(guildId, userId);
  await db.update(economy).set({ bank: sql`GREATEST(0, ${economy.bank} - ${amount})` }).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
}

export async function setLastDaily(guildId: string, userId: string, at: Date) {
  await db.update(economy).set({ lastDaily: at }).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
}

export async function setLastRob(guildId: string, userId: string, at: Date) {
  await db.update(economy).set({ lastRob: at }).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
}

export async function topRichest(guildId: string, limit = 10) {
  return db.select().from(economy).where(eq(economy.guildId, guildId)).orderBy(desc(economy.balance)).limit(limit);
}

// ── Daily streak helpers ──────────────────────────────────────────────────────

const DAILY_MS = 24 * 60 * 60 * 1000;
const STREAK_EXPIRE_MS = 48 * 60 * 60 * 1000;

export function calcDailyCoins(streak: number): number {
  // day 1=500, +50 per day, max 1500 at day 21
  return Math.min(500 + streak * 50, 1500);
}

export async function claimDailyStreak(guildId: string, userId: string): Promise<{ coins: number; streak: number; alreadyClaimed: boolean; nextClaimTs: number }> {
  const eco = await getEconomy(guildId, userId);
  const now = Date.now();

  if (eco.lastDaily) {
    const since = now - eco.lastDaily.getTime();
    if (since < DAILY_MS) {
      return { coins: 0, streak: eco.streak, alreadyClaimed: true, nextClaimTs: Math.floor((eco.lastDaily.getTime() + DAILY_MS) / 1000) };
    }
  }

  const since = eco.lastDaily ? now - eco.lastDaily.getTime() : Infinity;
  const newStreak = eco.lastDaily && since < STREAK_EXPIRE_MS ? eco.streak + 1 : 1;
  const coins = calcDailyCoins(newStreak - 1);

  await db.update(economy).set({
    balance: sql`${economy.balance} + ${coins}`,
    lastDaily: new Date(now),
    streak: newStreak,
    streakUpdatedAt: new Date(now),
  }).where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));

  return { coins, streak: newStreak, alreadyClaimed: false, nextClaimTs: Math.floor((now + DAILY_MS) / 1000) };
}

// ── Rep helpers ───────────────────────────────────────────────────────────────

export async function getRep(guildId: string, userId: string) {
  const rows = await db.select().from(userRep).where(and(eq(userRep.guildId, guildId), eq(userRep.userId, userId)));
  return rows[0] ?? { repCount: 0, lastRepGiven: null, lastRepRecipient: null };
}

export async function giveRep(guildId: string, giverId: string, recipientId: string): Promise<{ success: boolean; reason?: string }> {
  const giverData = await getRep(guildId, giverId);
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (giverData.lastRepGiven && now.getTime() - giverData.lastRepGiven.getTime() < oneDayMs) {
    const nextTs = Math.floor((giverData.lastRepGiven.getTime() + oneDayMs) / 1000);
    return { success: false, reason: `you already gave rep today. next rep available <t:${nextTs}:R>.` };
  }
  await db.insert(userRep).values({ guildId, userId: giverId, repCount: 0, lastRepGiven: now, lastRepRecipient: recipientId }).onConflictDoNothing();
  await db.update(userRep).set({ lastRepGiven: now, lastRepRecipient: recipientId }).where(and(eq(userRep.guildId, guildId), eq(userRep.userId, giverId)));
  await db.insert(userRep).values({ guildId, userId: recipientId, repCount: 1 }).onConflictDoNothing();
  await db.update(userRep).set({ repCount: sql`${userRep.repCount} + 1` }).where(and(eq(userRep.guildId, guildId), eq(userRep.userId, recipientId)));
  return { success: true };
}

// ── Buff helpers ──────────────────────────────────────────────────────────────

export async function getActiveBuff(guildId: string, userId: string, buffType: string) {
  const rows = await db.select().from(activeBuffs).where(
    and(eq(activeBuffs.guildId, guildId), eq(activeBuffs.userId, userId), eq(activeBuffs.buffType, buffType), gt(activeBuffs.expiresAt, new Date()))
  );
  return rows[0] ?? null;
}

export async function addBuff(guildId: string, userId: string, buffType: string, multiplier: number, durationMs: number) {
  await db.delete(activeBuffs).where(and(eq(activeBuffs.guildId, guildId), eq(activeBuffs.userId, userId), eq(activeBuffs.buffType, buffType)));
  await db.insert(activeBuffs).values({ guildId, userId, buffType, multiplier, expiresAt: new Date(Date.now() + durationMs) });
}

export async function getAllActiveBuffs(guildId: string, userId: string) {
  return db.select().from(activeBuffs).where(and(eq(activeBuffs.guildId, guildId), eq(activeBuffs.userId, userId), gt(activeBuffs.expiresAt, new Date())));
}
