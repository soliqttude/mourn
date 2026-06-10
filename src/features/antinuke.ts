import {
  type Client,
  type Guild,
  type GuildMember,
  type TextChannel,
  AuditLogEvent,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "../db/index.js";
import { antinukeWhitelist, antinukeAdmins } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { logger } from "../lib/logger.js";
import { eq, and } from "drizzle-orm";

interface ActionRecord { count: number; resetAt: number; }
const records = new Map<string, ActionRecord>();
const WINDOW_MS = 8_000;

const punished = new Map<string, number>();
const PUNISH_COOLDOWN = 45_000;

const wlCache = new Map<string, { set: Set<string>; expiry: number }>();
const WL_TTL = 60_000;

const adminCache = new Map<string, { set: Set<string>; expiry: number }>();

export async function getWhitelist(guildId: string): Promise<Set<string>> {
  const cached = wlCache.get(guildId);
  if (cached && Date.now() < cached.expiry) return cached.set;
  const rows = await db
    .select({ userId: antinukeWhitelist.userId })
    .from(antinukeWhitelist)
    .where(eq(antinukeWhitelist.guildId, guildId));
  const set = new Set(rows.map((r) => r.userId));
  wlCache.set(guildId, { set, expiry: Date.now() + WL_TTL });
  return set;
}

export async function getAdmins(guildId: string): Promise<Set<string>> {
  const cached = adminCache.get(guildId);
  if (cached && Date.now() < cached.expiry) return cached.set;
  const rows = await db
    .select({ userId: antinukeAdmins.userId })
    .from(antinukeAdmins)
    .where(eq(antinukeAdmins.guildId, guildId));
  const set = new Set(rows.map((r) => r.userId));
  adminCache.set(guildId, { set, expiry: Date.now() + WL_TTL });
  return set;
}

export function invalidateWhitelistCache(guildId: string): void {
  wlCache.delete(guildId);
}

export function invalidateAdminCache(guildId: string): void {
  adminCache.delete(guildId);
}

export async function isAntinukeAdmin(guildId: string, userId: string, ownerId: string): Promise<boolean> {
  if (userId === ownerId) return true;
  const admins = await getAdmins(guildId);
  return admins.has(userId);
}

function tick(key: string, threshold: number): boolean {
  const now = Date.now();
  const cur = records.get(key);
  if (!cur || cur.resetAt < now) {
    records.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count++;
  return cur.count === threshold;
}

function alreadyPunished(guildId: string, userId: string): boolean {
  const key = `${guildId}:${userId}`;
  const ts = punished.get(key);
  if (ts && Date.now() - ts < PUNISH_COOLDOWN) return true;
  punished.set(key, Date.now());
  return false;
}

const AUDIT_MAP: Partial<Record<string, AuditLogEvent>> = {
  channel_delete:  AuditLogEvent.ChannelDelete,
  channel_create:  AuditLogEvent.ChannelCreate,
  role_delete:     AuditLogEvent.RoleDelete,
  role_create:     AuditLogEvent.RoleCreate,
  ban_add:         AuditLogEvent.MemberBanAdd,
  member_kick:     AuditLogEvent.MemberKick,
  webhook_create:  AuditLogEvent.WebhookCreate,
  webhook_delete:  AuditLogEvent.WebhookDelete,
  bot_add:         AuditLogEvent.BotAdd,
  emoji_delete:    AuditLogEvent.EmojiDelete,
  vanity_update:   AuditLogEvent.GuildUpdate,
};

const ACTION_LABELS: Record<string, string> = {
  channel_delete:  "mass channel deletion",
  channel_create:  "mass channel creation",
  role_delete:     "mass role deletion",
  role_create:     "mass role creation",
  ban_add:         "mass member banning",
  member_kick:     "mass member kicking",
  webhook_create:  "mass webhook creation",
  webhook_delete:  "mass webhook deletion",
  bot_add:         "unauthorized bot add",
  emoji_delete:    "mass emoji deletion",
  perm_escalation: "admin permission escalation",
  vanity_update:   "vanity url change",
};

async function sendAlert(
  guild: Guild,
  logChannelId: string | null | undefined,
  executorId: string,
  type: string,
  actionTaken: string,
): Promise<void> {
  const chId = logChannelId ?? guild.systemChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
  if (!ch?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x1a0000)
    .setAuthor({ name: `antinuke · threat neutralized` })
    .setDescription(
      [
        `**threat** — ${ACTION_LABELS[type] ?? type}`,
        `**by** — <@${executorId}> (\`${executorId}\`)`,
        `**action** — ${actionTaken}`,
      ].join("\n"),
    );

  await ch.send({ embeds: [embed] }).catch(() => {});
}

async function punish(
  guild: Guild,
  member: GuildMember,
  action: string,
): Promise<string> {
  const removable = member.roles.cache.filter((r) => !r.managed && r.id !== guild.id);
  for (const [, role] of removable) {
    await member.roles.remove(role, "antinuke: role strip before punishment").catch(() => {});
  }

  if (action === "kick") {
    if (member.kickable) {
      await member.kick("antinuke: destructive activity detected");
      return "kicked";
    }
  } else if (action === "strip") {
    return "stripped";
  } else {
    if (member.bannable) {
      await member.ban({ reason: "antinuke: destructive activity detected" });
      return "banned";
    }
  }
  return "stripped (couldn't kick/ban — hierarchy)";
}

export async function handleAntinukeAction(
  client: Client,
  guild: Guild,
  type: string,
  _targetId: string,
): Promise<void> {
  const settings = await getGuildSettings(guild.id);
  if (!settings.antinukeEnabled) return;

  const auditType = AUDIT_MAP[type];
  if (!auditType) return;

  let executorId: string | null = null;
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type: auditType });
    const entry = logs.entries.first();
    if (!entry || !entry.executor) return;
    if (entry.executor.bot) return;
    if (Date.now() - entry.createdTimestamp > 6_000) return;
    executorId = entry.executor.id;
  } catch (err) {
    logger.warn({ err }, "antinuke: audit log fetch failed");
    return;
  }

  if (!executorId) return;
  if (executorId === guild.ownerId) return;
  if (executorId === client.user?.id) return;

  const whitelist = await getWhitelist(guild.id);
  if (whitelist.has(executorId)) return;

  const threshold = settings.antinukeThreshold ?? 3;
  const shouldAct = tick(`${guild.id}:${executorId}:${type}`, threshold);
  if (!shouldAct) return;
  if (alreadyPunished(guild.id, executorId)) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  try {
    const actionTaken = await punish(guild, member, settings.antinukeAction ?? "ban");
    logger.warn(
      { guild: guild.id, executor: executorId, type, action: actionTaken },
      "antinuke: punishment executed",
    );
    await sendAlert(guild, settings.antinukeLogChannel, executorId, type, actionTaken);
  } catch (err) {
    logger.warn({ err }, "antinuke: punishment failed");
  }
}

export async function handlePermissionEscalation(
  client: Client,
  guild: Guild,
  member: GuildMember,
  addedRoleIds: string[],
): Promise<void> {
  const settings = await getGuildSettings(guild.id);
  if (!settings.antinukeEnabled) return;

  const DANGER_PERMS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageWebhooks,
  ];

  const hasDangerPerm = addedRoleIds.some((roleId) => {
    const role = guild.roles.cache.get(roleId);
    if (!role) return false;
    return DANGER_PERMS.some((p) => role.permissions.has(p));
  });

  if (!hasDangerPerm) return;

  let executorId: string | null = null;
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
    const entry = logs.entries.first();
    if (!entry || !entry.executor) return;
    if (entry.executor.bot) return;
    if (Date.now() - entry.createdTimestamp > 6_000) return;
    executorId = entry.executor.id;
  } catch {
    return;
  }

  if (!executorId) return;
  if (executorId === guild.ownerId) return;
  if (executorId === client.user?.id) return;

  const whitelist = await getWhitelist(guild.id);
  if (whitelist.has(executorId)) return;
  if (alreadyPunished(guild.id, executorId)) return;

  const executor = await guild.members.fetch(executorId).catch(() => null);
  if (!executor) return;

  for (const roleId of addedRoleIds) {
    const role = guild.roles.cache.get(roleId);
    if (role && !role.managed) {
      await member.roles.remove(role, "antinuke: unauthorized permission escalation").catch(() => {});
    }
  }

  try {
    const actionTaken = await punish(guild, executor, settings.antinukeAction ?? "ban");
    logger.warn(
      { guild: guild.id, executor: executorId, target: member.id, action: actionTaken },
      "antinuke: permission escalation — punishment executed",
    );
    await sendAlert(guild, settings.antinukeLogChannel, executorId, "perm_escalation", actionTaken);
  } catch (err) {
    logger.warn({ err }, "antinuke: perm escalation punishment failed");
  }
}
