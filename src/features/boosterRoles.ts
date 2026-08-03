import { type Guild, type GuildMember, DiscordAPIError } from "discord.js";
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

// FIX: previously, if role creation succeeded but member.roles.add() failed,
// the DB row still got inserted — leaving the user "assigned" a role they
// never actually received, with no way to recover except manual DB surgery.
// And if the DB insert itself failed after a successful create+add, the role
// existed and was assigned but was completely untracked. Now every partial
// failure rolls back the Discord-side role so Discord and DB state can't
// drift out of sync.
export async function createBoosterRole(guild: Guild, member: GuildMember): Promise<string | null> {
  const existing = await getBoosterRole(guild.id, member.id);
  if (existing) {
    // Defensive check: make sure the role we think exists actually does and
    // is actually assigned. If not, clear the stale row and re-create below
    // instead of returning a dead reference forever.
    const role = guild.roles.cache.get(existing);
    if (role && member.roles.cache.has(existing)) return existing;
    await db.delete(boosterRoles)
      .where(and(eq(boosterRoles.guildId, guild.id), eq(boosterRoles.userId, member.id)))
      .catch((err) => logger.warn({ err }, "boosterrole: failed to clear stale row before re-create"));
  }

  const cfg = await getBoosterRoleConfig(guild.id);
  const role = await guild.roles.create({
    name: `${member.user.username}'s role`,
    color: 0x2f3136,
    reason: "boosterrole create",
  }).catch((err) => {
    logger.warn({ err }, "boosterrole: role creation failed");
    return null;
  });

  if (!role) return null;

  if (cfg?.baseRoleId) {
    const baseRole = guild.roles.cache.get(cfg.baseRoleId);
    if (baseRole) {
      await role.setPosition(baseRole.position).catch(() => {});
    }
  }

  const added = await member.roles.add(role).then(() => true).catch((err) => {
    logger.warn({ err, guild: guild.id, user: member.id }, "boosterrole: failed to assign role to member");
    return false;
  });

  if (!added) {
    // Rollback: don't leave an unassigned orphan role sitting in the server.
    await role.delete("boosterrole: rollback — assignment failed").catch((err) => {
      logger.warn({ err }, "boosterrole: rollback role deletion also failed — orphan role may remain");
    });
    return null;
  }

  try {
    await db.insert(boosterRoles).values({ guildId: guild.id, userId: member.id, roleId: role.id });
  } catch (err) {
    // Rollback: role exists and is assigned, but we couldn't record it —
    // untracked roles can never be cleaned up through normal commands, so
    // undo the Discord-side change instead of leaving a ghost.
    logger.warn({ err, guild: guild.id, user: member.id }, "boosterrole: DB insert failed, rolling back role");
    await member.roles.remove(role).catch(() => {});
    await role.delete("boosterrole: rollback — DB insert failed").catch(() => {});
    return null;
  }

  return role.id;
}

// FIX: previously deleted the DB row even when role.delete() failed for a
// real reason (permissions, rate limit, etc.) — not just "role already
// gone." That silently orphaned the Discord role with the DB thinking it was
// cleaned up. Now we only proceed with the DB delete if either the role
// didn't exist to begin with, or the Discord deletion actually succeeded.
export async function deleteBoosterRole(guild: Guild, userId: string): Promise<boolean> {
  const roleId = await getBoosterRole(guild.id, userId);
  if (!roleId) return false;

  const role = guild.roles.cache.get(roleId);
  if (role) {
    try {
      await role.delete("boosterrole remove");
    } catch (err) {
      const isUnknownRole = err instanceof DiscordAPIError && err.code === 10011; // Unknown Role
      if (!isUnknownRole) {
        logger.warn({ err, guild: guild.id, userId }, "boosterrole: role deletion failed, keeping DB record intact");
        return false; // don't clear the DB row — role may still exist, avoid losing track of it
      }
      // role was already gone on Discord's side — fine to proceed and clean up the DB row
    }
  }

  await db.delete(boosterRoles)
    .where(and(eq(boosterRoles.guildId, guild.id), eq(boosterRoles.userId, userId)));
  return true;
}

export async function handleBoostEnd(guild: Guild, member: GuildMember): Promise<void> {
  await deleteBoosterRole(guild, member.id).catch((err) => logger.warn({ err }, "booster role cleanup failed"));
}
