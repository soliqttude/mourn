import { type Guild, type GuildMember } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { boosterRoles, boosterRoleConfig } from "../db/schema.js";
import { logger } from "../lib/logger.js";

export async function getBoosterRole(guildId: string, userId: string): Promise<string | null> {
  const rows = await db.select().from(boosterRoles)
    .where(and(eq(boosterRoles.guildId, guildId), eq(boosterRoles.userId, userId)));
  return rows[0]?.roleId ?? null;
}

export async function getBoosterRoleConfig(guildId: string) {
  const rows = await db.select().from(boosterRoleConfig).where(eq(boosterRoleConfig.guildId, guildId));
  return rows[0] ?? null;
}

export async function createBoosterRole(guild: Guild, member: GuildMember): Promise<string | null> {
  const existing = await getBoosterRole(guild.id, member.id);
  if (existing) return existing;

  const cfg = await getBoosterRoleConfig(guild.id);
  const role = await guild.roles.create({
    name: `${member.user.username}'s role`,
    color: 0x2f3136,
    reason: "boosterrole create",
  }).catch(() => null);

  if (!role) return null;

  if (cfg?.baseRoleId) {
    const baseRole = guild.roles.cache.get(cfg.baseRoleId);
    if (baseRole) {
      await role.setPosition(baseRole.position).catch(() => {});
    }
  }

  await member.roles.add(role).catch(() => {});
  await db.insert(boosterRoles).values({ guildId: guild.id, userId: member.id, roleId: role.id });
  return role.id;
}

export async function deleteBoosterRole(guild: Guild, userId: string): Promise<boolean> {
  const roleId = await getBoosterRole(guild.id, userId);
  if (!roleId) return false;

  const role = guild.roles.cache.get(roleId);
  if (role) await role.delete("boosterrole remove").catch(() => {});

  await db.delete(boosterRoles)
    .where(and(eq(boosterRoles.guildId, guild.id), eq(boosterRoles.userId, userId)));
  return true;
}

export async function handleBoostEnd(guild: Guild, member: GuildMember): Promise<void> {
  await deleteBoosterRole(guild, member.id).catch((err) => logger.warn({ err }, "booster role cleanup failed"));
}
