import {
  type Client,
  type Guild,
  type TextChannel,
  AuditLogEvent,
  EmbedBuilder,
} from "discord.js";
import { db } from "../db/index.js";
import { antinukeWhitelist } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { logger } from "../lib/logger.js";
import { eq } from "drizzle-orm";

// Per-action rate tracker: "guildId:userId:type" -> { count, resetAt }
interface ActionRecord { count: number; resetAt: number; }
const records = new Map<string, ActionRecord>();
const WINDOW_MS = 10_000;

// Whitelist cache: guildId -> { set, expiry }
const wlCache = new Map<string, { set: Set<string>; expiry: number }>();
const WL_TTL = 60_000;

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

export function invalidateWhitelistCache(guildId: string): void {
  wlCache.delete(guildId);
}

function tick(key: string, threshold: number): boolean {
  const now = Date.now();
  const cur = records.get(key);
  if (!cur || cur.resetAt < now) {
    records.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count++;
  // Only trigger exactly at threshold (not every call after)
  return cur.count === threshold;
}

// Maps our internal type strings -> Discord audit log events
const AUDIT_MAP: Partial<Record<string, AuditLogEvent>> = {
  channel_delete:  AuditLogEvent.ChannelDelete,
  channel_create:  AuditLogEvent.ChannelCreate,
  role_delete:     AuditLogEvent.RoleDelete,
  role_create:     AuditLogEvent.RoleCreate,
  ban_add:         AuditLogEvent.MemberBanAdd,
  webhook_create:  AuditLogEvent.WebhookCreate,
  bot_add:         AuditLogEvent.BotAdd,
};

const ACTION_LABELS: Record<string, string> = {
  channel_delete: "mass channel deletion",
  channel_create: "mass channel creation",
  role_delete:    "mass role deletion",
  role_create:    "mass role creation",
  ban_add:        "mass member banning",
  webhook_create: "mass webhook creation",
  bot_add:        "unauthorized bot addition",
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
    .setColor(0xe74c3c)
    .setTitle("🚨 Anti-Nuke Triggered")
    .setDescription(
      `**Threat detected:** ${ACTION_LABELS[type] ?? type}\n\n` +
      `**Executor:** <@${executorId}> (\`${executorId}\`)\n` +
      `**Punishment:** \`${actionTaken}\`\n` +
      `**When:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    )
    .setFooter({ text: "Anti-Nuke System" })
    .setTimestamp();
  await ch.send({ embeds: [embed] }).catch(() => {});
}

async function punish(
  guild: Guild,
  member: Awaited<ReturnType<Guild["members"]["fetch"]>>,
  action: string,
): Promise<string> {
  if (action === "kick") {
    if (member.kickable) {
      await member.kick("🛡️ Anti-Nuke: suspicious destructive activity");
      return "kick";
    }
    // fall through to strip
  } else if (action === "strip") {
    const removable = member.roles.cache.filter((r) => !r.managed && r.id !== guild.id);
    for (const [, role] of removable) {
      await member.roles.remove(role, "Anti-Nuke: role strip").catch(() => {});
    }
    return "strip";
  } else {
    // ban (default)
    if (member.bannable) {
      await member.ban({ reason: "🛡️ Anti-Nuke: suspicious destructive activity" });
      return "ban";
    }
    // fall through to strip if unbannable
  }
  // Fallback: strip roles
  const removable = member.roles.cache.filter((r) => !r.managed && r.id !== guild.id);
  for (const [, role] of removable) {
    await member.roles.remove(role, "Anti-Nuke: fallback strip").catch(() => {});
  }
  return "strip (fallback — insufficient hierarchy for kick/ban)";
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

  // Fetch audit log to get executor
  let executorId: string | null = null;
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type: auditType });
    const entry = logs.entries.first();
    if (!entry || !entry.executor) return;
    if (entry.executor.bot) return;
    if (Date.now() - entry.createdTimestamp > 8_000) return;
    executorId = entry.executor.id;
  } catch (err) {
    logger.warn({ err }, "antinuke: audit log fetch failed");
    return;
  }

  if (!executorId) return;
  if (executorId === guild.ownerId) return;
  if (executorId === client.user?.id) return;

  // Whitelist check
  const whitelist = await getWhitelist(guild.id);
  if (whitelist.has(executorId)) return;

  const threshold = (settings as any).antinukeThreshold ?? 3;
  const shouldAct = tick(`${guild.id}:${executorId}:${type}`, threshold);
  if (!shouldAct) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  try {
    const actionTaken = await punish(guild, member, settings.antinukeAction ?? "ban");
    logger.warn(
      { guild: guild.id, executor: executorId, type, action: actionTaken },
      "antinuke: punishment executed",
    );
    await sendAlert(guild, (settings as any).antinukeLogChannel, executorId, type, actionTaken);
  } catch (err) {
    logger.warn({ err }, "antinuke: punishment failed");
  }
}
