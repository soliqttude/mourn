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
import { antinukeWhitelist, antinukeAdmins, antinukeModules } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { logger } from "../lib/logger.js";
import { eq } from "drizzle-orm";
import { and } from "drizzle-orm";

interface ActionRecord { count: number; resetAt: number; }
export interface ModuleConfig {
  enabled: boolean;
  threshold: number;
  punishment: string;
  countCommands: boolean;
}

const records = new Map<string, ActionRecord>();
const WINDOW_MS = 8_000;

const punished = new Map<string, number>();
const PUNISH_COOLDOWN = 45_000;

const wlCache    = new Map<string, { set: Set<string>; expiry: number }>();
const adminCache = new Map<string, { set: Set<string>; expiry: number }>();
const modCache   = new Map<string, { map: Map<string, ModuleConfig>; expiry: number }>();
const CACHE_TTL  = 60_000;

// ─── Whitelist ───────────────────────────────────────────────────────────────
export async function getWhitelist(guildId: string): Promise<Set<string>> {
  const c = wlCache.get(guildId);
  if (c && Date.now() < c.expiry) return c.set;
  const rows = await db.select({ userId: antinukeWhitelist.userId }).from(antinukeWhitelist).where(eq(antinukeWhitelist.guildId, guildId));
  const set = new Set(rows.map(r => r.userId));
  wlCache.set(guildId, { set, expiry: Date.now() + CACHE_TTL });
  return set;
}
export function invalidateWhitelistCache(guildId: string): void { wlCache.delete(guildId); }

// ─── Admins ──────────────────────────────────────────────────────────────────
export async function getAdmins(guildId: string): Promise<Set<string>> {
  const c = adminCache.get(guildId);
  if (c && Date.now() < c.expiry) return c.set;
  const rows = await db.select({ userId: antinukeAdmins.userId }).from(antinukeAdmins).where(eq(antinukeAdmins.guildId, guildId));
  const set = new Set(rows.map(r => r.userId));
  adminCache.set(guildId, { set, expiry: Date.now() + CACHE_TTL });
  return set;
}
export function invalidateAdminCache(guildId: string): void { adminCache.delete(guildId); }
export async function isAntinukeAdmin(guildId: string, userId: string, ownerId: string): Promise<boolean> {
  if (userId === ownerId) return true;
  return (await getAdmins(guildId)).has(userId);
}

// ─── Per-module config ────────────────────────────────────────────────────────
export async function getModuleConfigs(guildId: string): Promise<Map<string, ModuleConfig>> {
  const c = modCache.get(guildId);
  if (c && Date.now() < c.expiry) return c.map;
  try {
    const rows = await db.select().from(antinukeModules).where(eq(antinukeModules.guildId, guildId));
    const map = new Map<string, ModuleConfig>();
    for (const row of rows) {
      map.set(row.module, { enabled: row.enabled, threshold: row.threshold, punishment: row.punishment, countCommands: row.countCommands });
    }
    modCache.set(guildId, { map, expiry: Date.now() + CACHE_TTL });
    return map;
  } catch {
    return new Map();
  }
}
export function invalidateModuleCache(guildId: string): void { modCache.delete(guildId); }

// ─── Rate limiting ────────────────────────────────────────────────────────────
function tick(key: string, threshold: number): boolean {
  const now = Date.now();
  const cur = records.get(key);
  if (!cur || cur.resetAt < now) {
    records.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return threshold <= 1;
  }
  cur.count++;
  return cur.count >= threshold;
}

function alreadyPunished(guildId: string, userId: string): boolean {
  const key = `${guildId}:${userId}`;
  const ts = punished.get(key);
  if (ts && Date.now() - ts < PUNISH_COOLDOWN) return true;
  punished.set(key, Date.now());
  return false;
}

// ─── Audit log helper ─────────────────────────────────────────────────────────
async function fetchExecutor(guild: Guild, auditType: AuditLogEvent): Promise<string | null> {
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type: auditType });
    const entry = logs.entries.first();
    if (!entry?.executor) return null;
    if (entry.executor.bot) return null;
    if (Date.now() - entry.createdTimestamp > 6_000) return null;
    return entry.executor.id;
  } catch {
    return null;
  }
}

// ─── Alert ───────────────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  ban_add:        "mass member banning",
  member_kick:    "mass member kicking",
  role_delete:    "mass role deletion",
  channel_delete: "mass channel deletion",
  channel_create: "mass channel creation",
  emoji_delete:   "mass emoji deletion",
  webhook_create: "mass webhook creation",
  bot_add:        "unauthorized bot added",
  vanity_update:  "vanity URL changed",
  perm_escalation:"admin permission escalation",
};

async function sendAlert(guild: Guild, logChannelId: string | null | undefined, executorId: string, type: string, actionTaken: string): Promise<void> {
  const chId = logChannelId ?? guild.systemChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
  if (!ch?.isTextBased()) return;
  const embed = new EmbedBuilder()
    .setColor(0x1a0000)
    .setAuthor({ name: "antinuke · threat neutralized" })
    .setDescription([
      `**threat** — ${ACTION_LABELS[type] ?? type}`,
      `**by** — <@${executorId}> (\`${executorId}\`)`,
      `**action** — ${actionTaken}`,
    ].join("\n"));
  await ch.send({ embeds: [embed] }).catch(() => {});
}

// ─── Punish ───────────────────────────────────────────────────────────────────
async function punish(guild: Guild, member: GuildMember, action: string): Promise<string> {
  const removable = member.roles.cache.filter(r => !r.managed && r.id !== guild.id);
  for (const [, role] of removable) {
    await member.roles.remove(role, "antinuke: strip before punishment").catch(() => {});
  }
  if (action === "kick") {
    if (member.kickable) { await member.kick("antinuke: destructive activity"); return "kicked"; }
  } else if (action === "strip") {
    return "stripped";
  } else {
    if (member.bannable) { await member.ban({ reason: "antinuke: destructive activity" }); return "banned"; }
  }
  return "stripped (hierarchy prevents kick/ban)";
}

// ─── Type → module name ───────────────────────────────────────────────────────
const TYPE_MODULE: Record<string, string> = {
  ban_add:        "ban",
  member_kick:    "kick",
  role_delete:    "role",
  channel_delete: "channel",
  channel_create: "channel",
  emoji_delete:   "emoji",
  webhook_create: "webhook",
  bot_add:        "botadd",
  vanity_update:  "vanity",
};

const AUDIT_MAP: Record<string, AuditLogEvent> = {
  ban_add:        AuditLogEvent.MemberBanAdd,
  member_kick:    AuditLogEvent.MemberKick,
  role_delete:    AuditLogEvent.RoleDelete,
  channel_delete: AuditLogEvent.ChannelDelete,
  channel_create: AuditLogEvent.ChannelCreate,
  emoji_delete:   AuditLogEvent.EmojiDelete,
  webhook_create: AuditLogEvent.WebhookCreate,
  bot_add:        AuditLogEvent.BotAdd,
  vanity_update:  AuditLogEvent.GuildUpdate,
};

// ─── Main action handler ──────────────────────────────────────────────────────
export async function handleAntinukeAction(client: Client, guild: Guild, type: string, _targetId: string): Promise<void> {
  const settings = await getGuildSettings(guild.id);
  if (!settings.antinukeEnabled) return;

  const moduleName = TYPE_MODULE[type];
  if (!moduleName) return;

  const modules = await getModuleConfigs(guild.id);
  const mod = modules.get(moduleName);
  if (!mod?.enabled) return;

  const auditType = AUDIT_MAP[type];
  if (!auditType) return;

  const executorId = await fetchExecutor(guild, auditType);
  if (!executorId) return;
  if (executorId === guild.ownerId || executorId === client.user?.id) return;

  const whitelist = await getWhitelist(guild.id);
  if (whitelist.has(executorId)) return;

  const threshold = (moduleName === "botadd" || moduleName === "vanity") ? 1 : mod.threshold;
  const shouldAct = tick(`${guild.id}:${executorId}:${moduleName}`, threshold);
  if (!shouldAct) return;
  if (alreadyPunished(guild.id, executorId)) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  try {
    const actionTaken = await punish(guild, member, mod.punishment ?? settings.antinukeAction ?? "ban");
    logger.warn({ guild: guild.id, executor: executorId, type, action: actionTaken }, "antinuke: punishment executed");
    await sendAlert(guild, settings.antinukeLogChannel, executorId, type, actionTaken);
  } catch (err) {
    logger.warn({ err }, "antinuke: punishment failed");
  }
}

// ─── Bot add handler ──────────────────────────────────────────────────────────
export async function handleBotAdd(client: Client, guild: Guild, botMember: GuildMember): Promise<void> {
  const settings = await getGuildSettings(guild.id);
  if (!settings.antinukeEnabled) return;

  const modules = await getModuleConfigs(guild.id);
  const mod = modules.get("botadd");
  if (!mod?.enabled) return;

  const whitelist = await getWhitelist(guild.id);
  if (whitelist.has(botMember.id)) return;

  // Kick the unauthorized bot immediately
  await botMember.kick("antinuke: unauthorized bot").catch(() => {});

  // Punish whoever added it
  const executorId = await fetchExecutor(guild, AuditLogEvent.BotAdd);
  if (!executorId || executorId === guild.ownerId || executorId === client.user?.id) return;
  if (whitelist.has(executorId)) return;
  if (alreadyPunished(guild.id, executorId)) return;

  const executor = await guild.members.fetch(executorId).catch(() => null);
  if (!executor) return;

  try {
    const actionTaken = await punish(guild, executor, mod.punishment ?? settings.antinukeAction ?? "ban");
    logger.warn({ guild: guild.id, bot: botMember.id, executor: executorId, action: actionTaken }, "antinuke: botadd punishment executed");
    await sendAlert(guild, settings.antinukeLogChannel, executorId, "bot_add", actionTaken);
  } catch (err) {
    logger.warn({ err }, "antinuke: botadd punishment failed");
  }
}

// ─── Vanity handler ───────────────────────────────────────────────────────────
export async function handleVanityChange(client: Client, guild: Guild): Promise<void> {
  const settings = await getGuildSettings(guild.id);
  if (!settings.antinukeEnabled) return;

  const modules = await getModuleConfigs(guild.id);
  const mod = modules.get("vanity");
  if (!mod?.enabled) return;

  const executorId = await fetchExecutor(guild, AuditLogEvent.GuildUpdate);
  if (!executorId || executorId === guild.ownerId || executorId === client.user?.id) return;

  const whitelist = await getWhitelist(guild.id);
  if (whitelist.has(executorId)) return;
  if (alreadyPunished(guild.id, executorId)) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  try {
    const actionTaken = await punish(guild, member, mod.punishment ?? settings.antinukeAction ?? "ban");
    logger.warn({ guild: guild.id, executor: executorId, action: actionTaken }, "antinuke: vanity change punishment executed");
    await sendAlert(guild, settings.antinukeLogChannel, executorId, "vanity_update", actionTaken);
  } catch (err) {
    logger.warn({ err }, "antinuke: vanity punishment failed");
  }
}

// ─── Permission escalation handler ───────────────────────────────────────────
export async function handlePermissionEscalation(client: Client, guild: Guild, member: GuildMember, addedRoleIds: string[]): Promise<void> {
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
    PermissionFlagsBits.MentionEveryone,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ModerateMembers,
  ];

  const hasDangerPerm = addedRoleIds.some(roleId => {
    const role = guild.roles.cache.get(roleId);
    return role ? DANGER_PERMS.some(p => role.permissions.has(p)) : false;
  });
  if (!hasDangerPerm) return;

  const executorId = await fetchExecutor(guild, AuditLogEvent.MemberRoleUpdate);
  if (!executorId || executorId === guild.ownerId || executorId === client.user?.id) return;

  const whitelist = await getWhitelist(guild.id);
  if (whitelist.has(executorId)) return;
  if (alreadyPunished(guild.id, executorId)) return;

  const executor = await guild.members.fetch(executorId).catch(() => null);
  if (!executor) return;

  for (const roleId of addedRoleIds) {
    const role = guild.roles.cache.get(roleId);
    if (role && !role.managed) {
      await member.roles.remove(role, "antinuke: perm escalation").catch(() => {});
    }
  }

  try {
    const actionTaken = await punish(guild, executor, settings.antinukeAction ?? "ban");
    logger.warn({ guild: guild.id, executor: executorId, target: member.id, action: actionTaken }, "antinuke: perm escalation punishment executed");
    await sendAlert(guild, settings.antinukeLogChannel, executorId, "perm_escalation", actionTaken);
  } catch (err) {
    logger.warn({ err }, "antinuke: perm escalation punishment failed");
  }
}
