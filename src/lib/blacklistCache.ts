import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { blacklist } from "../db/schema.js";

interface CacheEntry { blacklisted: boolean; reason: string | null; expiresAt: number }

const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000; // 5 minutes

export async function isBlacklisted(userId: string): Promise<{ blacklisted: boolean; reason: string | null }> {
  const cached = cache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return { blacklisted: cached.blacklisted, reason: cached.reason };
  }
  const rows = await db.select().from(blacklist).where(eq(blacklist.userId, userId));
  const entry: CacheEntry = {
    blacklisted: rows.length > 0,
    reason: rows[0]?.reason ?? null,
    expiresAt: Date.now() + TTL,
  };
  cache.set(userId, entry);
  return { blacklisted: entry.blacklisted, reason: entry.reason };
}

export function invalidateBlacklist(userId: string): void {
  cache.delete(userId);
}
