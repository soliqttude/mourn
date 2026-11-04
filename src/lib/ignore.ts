import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { globalIgnores } from "../db/schema.js";

/** True when a guild member or channel is on the guild's global ignore list. */
export async function isGloballyIgnored(guildId: string, userId: string, channelId: string): Promise<boolean> {
  const rows = await db.select({ targetId: globalIgnores.targetId, targetType: globalIgnores.targetType })
    .from(globalIgnores)
    .where(and(eq(globalIgnores.guildId, guildId), inArray(globalIgnores.targetType, ["member", "channel"])));
  return rows.some(row =>
    (row.targetType === "member" && row.targetId === userId) ||
    (row.targetType === "channel" && row.targetId === channelId)
  );
}
