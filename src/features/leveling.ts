import { and, eq, desc, sql } from "drizzle-orm";
import type { Client, Message } from "discord.js";
import { db } from "../db/index.js";
import { levels, levelRewards } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";

export function xpForLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

export function totalXpForLevel(level: number): number {
  let t = 0;
  for (let i = 0; i < level; i++) t += xpForLevel(i);
  return t;
}

export function levelFromXp(xp: number): number {
  let level = 0;
  let total = 0;
  while (true) {
    total += xpForLevel(level);
    if (xp < total) break;
    level++;
  }
  return level;
}

export async function getLevel(guildId: string, userId: string) {
  const rows = await db
    .select()
    .from(levels)
    .where(and(eq(levels.guildId, guildId), eq(levels.userId, userId)));
  return rows[0] ?? null;
}

export async function getLeaderboard(guildId: string, limit = 10) {
  return db
    .select()
    .from(levels)
    .where(eq(levels.guildId, guildId))
    .orderBy(desc(levels.xp))
    .limit(limit);
}

export async function handleLevelXp(client: Client, message: Message) {
  if (!message.guild || message.author.bot) return;
  const settings = await getGuildSettings(message.guild.id);
  if (!settings.levelsEnabled) return;

  const existing = await getLevel(message.guild.id, message.author.id);
  const now = new Date();
  if (existing?.lastMessageAt) {
    const diff = now.getTime() - existing.lastMessageAt.getTime();
    if (diff < 60_000) return;
  }

  const gained = Math.floor(Math.random() * 10) + 15;
  const oldLevel = existing?.level ?? 0;

  // FIX: previously computed `newXp = existing.xp + gained` in JS and wrote
  // that absolute value back. Two near-simultaneous messages from the same
  // user could both read the same stale xp before either write landed,
  // silently dropping the XP from whichever write lost the race. Now the
  // increment happens atomically at the DB level (`xp = levels.xp + gained`),
  // so concurrent calls can't stomp on each other. RETURNING gives back the
  // authoritative post-increment xp — and the level column, left untouched
  // in this statement, still holds the true "before" level for comparison.
  const updated = await db
    .insert(levels)
    .values({
      guildId: message.guild.id,
      userId: message.author.id,
      xp: gained,
      level: 0,
      lastMessageAt: now,
    })
    .onConflictDoUpdate({
      target: [levels.guildId, levels.userId],
      set: {
        xp: sql`${levels.xp} + ${gained}`,
        lastMessageAt: now,
      },
    })
    .returning({ xp: levels.xp, level: levels.level });

  const row = updated[0];
  const newXp = row.xp;
  const newLevel = levelFromXp(newXp);

  if (newLevel !== row.level) {
    await db
      .update(levels)
      .set({ level: newLevel })
      .where(and(eq(levels.guildId, message.guild.id), eq(levels.userId, message.author.id)));
  }

  if (newLevel > oldLevel) {
    const lvlUpMsg = `🎉 GG <@${message.author.id}>, you reached **level ${newLevel}**!`;
    if (settings.levelUpChannel) {
      const ch = message.guild.channels.cache.get(settings.levelUpChannel);
      if (ch?.isTextBased()) {
        await (ch as any).send({ content: lvlUpMsg }).catch(() => {});
      } else {
        await message.reply({ content: lvlUpMsg }).catch(() => {});
      }
    } else {
      await message.reply({ content: lvlUpMsg }).catch(() => {});
    }

    // FIX: previously only fetched rewards for the exact new level. If a
    // message ever pushed a user up more than one level at once (e.g. a
    // future XP-boost event), reward tiers in between were silently skipped
    // forever. Now grants every reward tier from oldLevel+1 through newLevel.
    const rewards = await db
      .select()
      .from(levelRewards)
      .where(
        and(
          eq(levelRewards.guildId, message.guild.id),
          sql`${levelRewards.level} > ${oldLevel} AND ${levelRewards.level} <= ${newLevel}`
        )
      );
    for (const r of rewards) {
      const role = message.guild.roles.cache.get(r.roleId);
      if (role && message.member) {
        await message.member.roles.add(role).catch(() => {});
      }
    }
  }
}
