import { db } from "../db/index.js";
import { economyTable } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

export interface EconomyRow {
  guildId: string;
  userId: string;
  balance: number;
  bank: number;
  bankCap: number;
  lastDaily: Date | null;
  lastWork: Date | null;
  lastCrime: Date | null;
  lastRob: Date | null;
  lastFish: Date | null;
  lastHunt: Date | null;
  lastMine: Date | null;
  lastWeekly: Date | null;
  lastBeg: Date | null;
}

async function ensureRow(guildId: string, userId: string): Promise<EconomyRow> {
  const [row] = await db
    .select()
    .from(economyTable)
    .where(and(eq(economyTable.guildId, guildId), eq(economyTable.userId, userId)));
  if (row) return row as EconomyRow;
  const [created] = await db
    .insert(economyTable)
    .values({ guildId, userId, balance: 0, bank: 0, bankCap: 10000, lastDaily: null, lastWork: null, lastCrime: null, lastRob: null, lastFish: null, lastHunt: null, lastMine: null, lastWeekly: null, lastBeg: null })
    .onConflictDoNothing()
    .returning();
  return (created ?? { guildId, userId, balance: 0, bank: 0, bankCap: 10000, lastDaily: null, lastWork: null, lastCrime: null, lastRob: null, lastFish: null, lastHunt: null, lastMine: null, lastWeekly: null, lastBeg: null }) as EconomyRow;
}

export async function getBalance(guildId: string, userId: string): Promise<EconomyRow> {
  return ensureRow(guildId, userId);
}

export async function addBalance(guildId: string, userId: string, amount: number): Promise<void> {
  await ensureRow(guildId, userId);
  await db
    .update(economyTable)
    .set({ balance: sql`${economyTable.balance} + ${amount}` })
    .where(and(eq(economyTable.guildId, guildId), eq(economyTable.userId, userId)));
}

export async function setBalance(guildId: string, userId: string, amount: number): Promise<void> {
  await ensureRow(guildId, userId);
  await db
    .update(economyTable)
    .set({ balance: amount })
    .where(and(eq(economyTable.guildId, guildId), eq(economyTable.userId, userId)));
}

export async function depositToBank(guildId: string, userId: string, amount: number): Promise<{ success: boolean; message: string }> {
  const row = await ensureRow(guildId, userId);
  if (amount > row.balance) return { success: false, message: "You don't have that much in your wallet." };
  const space = row.bankCap - row.bank;
  if (space <= 0) return { success: false, message: "Your bank is full." };
  const actual = Math.min(amount, space);
  await db
    .update(economyTable)
    .set({ balance: row.balance - actual, bank: row.bank + actual })
    .where(and(eq(economyTable.guildId, guildId), eq(economyTable.userId, userId)));
  return { success: true, message: `Deposited **${actual.toLocaleString()}** coins.` };
}

export async function withdrawFromBank(guildId: string, userId: string, amount: number): Promise<{ success: boolean; message: string }> {
  const row = await ensureRow(guildId, userId);
  if (amount > row.bank) return { success: false, message: "You don't have that much in your bank." };
  await db
    .update(economyTable)
    .set({ balance: row.balance + amount, bank: row.bank - amount })
    .where(and(eq(economyTable.guildId, guildId), eq(economyTable.userId, userId)));
  return { success: true, message: `Withdrew **${amount.toLocaleString()}** coins.` };
}

export async function transferCoins(guildId: string, fromId: string, toId: string, amount: number): Promise<{ success: boolean; message: string }> {
  const from = await ensureRow(guildId, fromId);
  if (amount > from.balance) return { success: false, message: "You don't have that much." };
  if (amount <= 0) return { success: false, message: "Amount must be positive." };
  await ensureRow(guildId, toId);
  await db
    .update(economyTable)
    .set({ balance: from.balance - amount })
    .where(and(eq(economyTable.guildId, guildId), eq(economyTable.userId, fromId)));
  await db
    .update(economyTable)
    .set({ balance: sql`${economyTable.balance} + ${amount}` })
    .where(and(eq(economyTable.guildId, guildId), eq(economyTable.userId, toId)));
  return { success: true, message: `Transferred **${amount.toLocaleString()}** coins.` };
}

export async function getLeaderboard(guildId: string, limit = 10): Promise<EconomyRow[]> {
  const rows = await db
    .select()
    .from(economyTable)
    .where(eq(economyTable.guildId, guildId))
    .orderBy(desc(sql`${economyTable.balance} + ${economyTable.bank}`))
    .limit(limit);
  return rows as EconomyRow[];
}

export async function getCooldown(guildId: string, userId: string, field: keyof EconomyRow): Promise<Date | null> {
  const row = await ensureRow(guildId, userId);
  return (row[field] as Date | null) ?? null;
}

export async function setCooldown(guildId: string, userId: string, field: string): Promise<void> {
  await ensureRow(guildId, userId);
  await db
    .update(economyTable)
    .set({ [field]: new Date() })
    .where(and(eq(economyTable.guildId, guildId), eq(economyTable.userId, userId)));
}

export function formatCoins(n: number): string {
  return n.toLocaleString();
}

export function cdRemaining(last: Date | null, ms: number): number {
  if (!last) return 0;
  const remaining = ms - (Date.now() - last.getTime());
  return remaining > 0 ? remaining : 0;
}

export function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
