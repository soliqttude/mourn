import {
  type Client,
  type Guild,
  AuditLogEvent,
  PermissionFlagsBits,
} from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { logger } from "../lib/logger.js";

interface ActionRecord {
  count: number;
  resetAt: number;
}

const records = new Map<string, ActionRecord>();
const WINDOW_MS = 10_000;
const THRESHOLD = 4;

function recordAction(key: string): boolean {
  const now = Date.now();
  const cur = records.get(key);
  if (!cur || cur.resetAt < now) {
    records.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count++;
  return cur.count >= THRESHOLD;
}

const AUDIT_MAP: Record<string, AuditLogEvent> = {
  channel_delete: AuditLogEvent.ChannelDelete,
  channel_create: AuditLogEvent.ChannelCreate,
  role_delete: AuditLogEvent.RoleDelete,
  role_create: AuditLogEvent.RoleCreate,
};

export async function handleAntinukeAction(
  client: Client,
  guild: Guild,
  type: string,
  _targetId: string
) {
  const settings = await getGuildSettings(guild.id);
  if (!settings.antinukeEnabled) return;
  const auditType = AUDIT_MAP[type];
  if (!auditType) return;
  let executorId: string | null = null;
  try {
    const log = await guild.fetchAuditLogs({ limit: 1, type: auditType });
    const entry = log.entries.first();
    if (!entry || !entry.executor || entry.executor.bot) return;
    if (Date.now() - entry.createdTimestamp > 10_000) return;
    executorId = entry.executor.id;
  } catch (err) {
    logger.warn({ err }, "Failed to fetch audit logs for antinuke");
    return;
  }
  if (!executorId) return;
  if (executorId === guild.ownerId) return;
  if (executorId === client.user?.id) return;

  const triggered = recordAction(`${guild.id}:${executorId}:${type}`);
  if (!triggered) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const action = settings.antinukeAction;
  try {
    if (action === "kick") {
      if (member.kickable) await member.kick("Antinuke triggered");
    } else if (action === "strip") {
      const removable = member.roles.cache.filter(
        (r) => !r.managed && r.id !== guild.id
      );
      for (const [, role] of removable) {
        await member.roles.remove(role).catch(() => {});
      }
    } else {
      if (member.bannable) await member.ban({ reason: "Antinuke triggered" });
    }
    logger.warn(
      { guild: guild.id, executor: executorId, type, action },
      "Antinuke action executed"
    );
  } catch (err) {
    logger.warn({ err }, "Antinuke action failed");
  }
}
