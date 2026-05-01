import { and, eq, desc } from "drizzle-orm";
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
  const newXp = (existing?.xp ?? 0) + gained;
  const oldLevel = existing?.level ?? 0;
  const newLevel = levelFromXp(newXp);
  await db
    .insert(levels)
    .values({
      guildId: message.guild.id,
      userId: message.author.id,
      xp: newXp,
      level: newLevel,
      lastMessageAt: now,
    })
    .onConflictDoUpdate({
      target: [levels.guildId, levels.userId],
      set: { xp: newXp, level: newLevel, lastMessageAt: now },
    });
  if (newLevel > oldLevel) {
    await message
      .reply({ content: `🎉 GG <@${message.author.id}>, you reached **level ${newLevel}**!` })
      .catch(() => {});
    const rewards = await db
      .select()
      .from(levelRewards)
      .where(and(eq(levelRewards.guildId, message.guild.id), eq(levelRewards.level, newLevel)));
    for (const r of rewards) {
      const role = message.guild.roles.cache.get(r.roleId);
      if (role && message.member) {
        await message.member.roles.add(role).catch(() => {});
      }
    }
  }
}
