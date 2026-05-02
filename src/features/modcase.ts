import { db } from "../db/index.js";
import { modCases } from "../db/schema.js";

export async function logCase(
  guildId: string,
  userId: string,
  moderatorId: string,
  action: string,
  reason: string,
  duration?: string
): Promise<number> {
  const result = await db.insert(modCases).values({
    guildId, userId, moderatorId, action, reason,
    duration: duration ?? null,
  }).returning({ id: modCases.id });
  return result[0].id;
}
