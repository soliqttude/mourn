import { type Guild, type GuildMember } from "discord.js";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { inviteCache, inviteUses, inviteBonus } from "../db/schema.js";
import { logger } from "../lib/logger.js";

const FAKE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function cacheGuildInvites(guild: Guild) {
  if (!guild.members.me?.permissions.has("ManageGuild")) return;
  const invites = await guild.invites.fetch().catch(() => null);
  if (!invites) return;
  for (const [, inv] of invites) {
    await db
      .insert(inviteCache)
      .values({ guildId: guild.id, code: inv.code, uses: inv.uses ?? 0, inviterId: inv.inviter?.id ?? null })
      .onConflictDoUpdate({
        target: [inviteCache.guildId, inviteCache.code],
        set: { uses: inv.uses ?? 0, inviterId: inv.inviter?.id ?? null },
      });
  }
}

export async function upsertInvite(guildId: string, code: string, uses: number, inviterId: string | null) {
  await db
    .insert(inviteCache)
    .values({ guildId, code, uses, inviterId })
    .onConflictDoUpdate({ target: [inviteCache.guildId, inviteCache.code], set: { uses, inviterId } });
}

export async function removeInvite(guildId: string, code: string) {
  await db.delete(inviteCache).where(and(eq(inviteCache.guildId, guildId), eq(inviteCache.code, code)));
}

export async function trackInviteUse(member: GuildMember) {
  if (!member.guild.members.me?.permissions.has("ManageGuild")) return null;
  try {
    const fresh = await member.guild.invites.fetch();
    const cached = await db.select().from(inviteCache).where(eq(inviteCache.guildId, member.guild.id));
    const cachedMap = new Map(cached.map((c) => [c.code, c]));
    let used: { code: string; inviterId: string | null } | null = null;
    for (const [, inv] of fresh) {
      const prev = cachedMap.get(inv.code);
      if ((inv.uses ?? 0) > (prev?.uses ?? 0)) {
        used = { code: inv.code, inviterId: inv.inviter?.id ?? prev?.inviterId ?? null };
      }
      await upsertInvite(member.guild.id, inv.code, inv.uses ?? 0, inv.inviter?.id ?? null);
    }
    if (used) {
      const isFake = Date.now() - member.user.createdTimestamp < FAKE_AGE_MS;
      await db.insert(inviteUses).values({
        guildId: member.guild.id,
        invitedUserId: member.id,
        inviterId: used.inviterId,
        code: used.code,
        isFake,
      });
      return used;
    }
  } catch (err) {
    logger.warn({ err }, "trackInviteUse failed");
  }
  return null;
}

export async function trackMemberLeave(guildId: string, userId: string) {
  await db
    .update(inviteUses)
    .set({ leftAt: new Date() })
    .where(and(eq(inviteUses.guildId, guildId), eq(inviteUses.invitedUserId, userId), isNull(inviteUses.leftAt)));
}

export async function getInviteStats(guildId: string, userId: string) {
  const rows = await db
    .select()
    .from(inviteUses)
    .where(and(eq(inviteUses.guildId, guildId), eq(inviteUses.inviterId, userId)));

  const fake = rows.filter((r) => r.isFake).length;
  const real = rows.filter((r) => !r.isFake);
  const left = real.filter((r) => r.leftAt !== null).length;
  const regular = real.filter((r) => r.leftAt === null).length;

  const bonusRow = await db
    .select()
    .from(inviteBonus)
    .where(and(eq(inviteBonus.guildId, guildId), eq(inviteBonus.userId, userId)));
  const bonus = bonusRow[0]?.bonus ?? 0;

  return { regular, left, fake, bonus };
}

export async function getTopInviters(guildId: string, limit = 100) {
  const rows = await db
    .select({
      inviterId: inviteUses.inviterId,
      fakeCount: sql<number>`count(*) filter (where ${inviteUses.isFake} = true)`.mapWith(Number),
      leftCount: sql<number>`count(*) filter (where ${inviteUses.leftAt} is not null and ${inviteUses.isFake} = false)`.mapWith(Number),
      regularCount: sql<number>`count(*) filter (where ${inviteUses.leftAt} is null and ${inviteUses.isFake} = false)`.mapWith(Number),
    })
    .from(inviteUses)
    .where(and(eq(inviteUses.guildId, guildId), isNotNull(inviteUses.inviterId)))
    .groupBy(inviteUses.inviterId)
    .orderBy(sql`count(*) filter (where ${inviteUses.isFake} = false) desc`)
    .limit(limit);

  const bonuses = await db.select().from(inviteBonus).where(eq(inviteBonus.guildId, guildId));
  const bonusMap = new Map(bonuses.map((b) => [b.userId, b.bonus]));

  return rows.map((r) => ({
    inviterId: r.inviterId!,
    regular: r.regularCount,
    left: r.leftCount,
    fake: r.fakeCount,
    bonus: bonusMap.get(r.inviterId!) ?? 0,
  }));
}

export async function getInviteCount(guildId: string, userId: string) {
  const s = await getInviteStats(guildId, userId);
  return s.regular + s.left + s.fake + s.bonus;
}
