import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { guildSettings } from "./schema.js";
import { config } from "../config.js";

const cache = new Map<string, typeof guildSettings.$inferSelect>();

export async function getGuildSettings(guildId: string) {
  if (!config.databaseEnabled) {
    const cached = cache.get(guildId);
    if (cached) return cached;
    const defaults = new Proxy(
      { guildId, prefix: config.defaultPrefix } as typeof guildSettings.$inferSelect,
      { get: (target, property) => property in target ? target[property as keyof typeof target] : null }
    );
    cache.set(guildId, defaults);
    return defaults;
  }

  const cached = cache.get(guildId);
  if (cached) return cached;
  const rows = await db
    .select()
    .from(guildSettings)
    .where(eq(guildSettings.guildId, guildId));
  if (rows[0]) {
    cache.set(guildId, rows[0]);
    return rows[0];
  }
  const inserted = await db
    .insert(guildSettings)
    .values({ guildId, prefix: config.defaultPrefix })
    .onConflictDoNothing()
    .returning();
  let row = inserted[0];
  if (!row) {
    const fetched = await db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId));
    row = fetched[0]!;
  }
  cache.set(guildId, row);
  return row;
}

export async function updateGuildSettings(
  guildId: string,
  patch: Partial<typeof guildSettings.$inferInsert>
) {
  if (!config.databaseEnabled) {
    const current = await getGuildSettings(guildId);
    Object.assign(current as object, patch);
    cache.set(guildId, current);
    return current;
  }
  await getGuildSettings(guildId);
  await db
    .update(guildSettings)
    .set(patch)
    .where(eq(guildSettings.guildId, guildId));
  cache.delete(guildId);
  return getGuildSettings(guildId);
}

export function invalidateGuildSettings(guildId: string) {
  cache.delete(guildId);
}
