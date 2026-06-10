import { type GuildMember, type TextChannel, EmbedBuilder } from "discord.js";
import { logger } from "../lib/logger.js";
import { getGuildSettings } from "../db/settings.js";

interface JoinWindow {
  members: GuildMember[];
  resetAt: number;
  raidActioned: boolean;
}

const joinTracker = new Map<string, JoinWindow>();
const WINDOW_MS = 10_000;
const lockdownTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface AgeGateBatch {
  count: number;
  users: { id: string; tag: string; ageDays: number }[];
  timer: ReturnType<typeof setTimeout>;
}
const ageGateBatches = new Map<string, AgeGateBatch>();

async function actionMember(member: GuildMember, action: string): Promise<boolean> {
  try {
    if (action === "ban") {
      if (member.bannable) { await member.ban({ reason: "antiraid: triggered" }); return true; }
    } else if (action === "timeout") {
      if (member.moderatable) { await member.timeout(15 * 60 * 1000, "antiraid: triggered"); return true; }
    } else {
      if (member.kickable) { await member.kick("antiraid: triggered"); return true; }
    }
  } catch {}
  return false;
}

async function lockServer(guild: GuildMember["guild"]): Promise<number> {
  const everyone = guild.roles.everyone;
  const channels = guild.channels.cache.filter(c => c.isTextBased() && c.type !== 11 && c.type !== 12);
  let count = 0;
  for (const [, ch] of channels) {
    try { await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: false }); count++; }
    catch {}
  }
  return count;
}

async function unlockServer(guild: GuildMember["guild"]): Promise<void> {
  const everyone = guild.roles.everyone;
  const channels = guild.channels.cache.filter(c => c.isTextBased() && c.type !== 11 && c.type !== 12);
  for (const [, ch] of channels) {
    try { await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: null }); }
    catch {}
  }
}

function detectUsernamePattern(members: GuildMember[]): boolean {
  if (members.length < 3) return false;
  const names = members.map(m => m.user.username.toLowerCase().replace(/\d+/g, ""));
  const counts = new Map<string, number>();
  for (const name of names) {
    if (name.length >= 4) {
      const prefix = name.slice(0, 4);
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
  }
  for (const count of counts.values()) { if (count >= 3) return true; }
  return false;
}

async function sendAlert(
  guild: GuildMember["guild"],
  logChannelId: string | null | undefined,
  lines: string[],
  title: string,
  color = 0x1a0600,
): Promise<void> {
  const chId = logChannelId ?? guild.systemChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
  if (!ch?.isTextBased()) return;
  const embed = new EmbedBuilder().setColor(color).setAuthor({ name: `antiraid · ${title}` }).setDescription(lines.join("\n"));
  await ch.send({ embeds: [embed] }).catch(() => {});
}

export async function handleAntiraidJoin(member: GuildMember): Promise<void> {
  const settings = await getGuildSettings(member.guild.id);
  if (!settings.antiraidEnabled) return;

  const guild = member.guild;
  const action = settings.antiraidAction ?? "kick";
  const ageDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
  const requireAvatar = (settings as any).antiraidRequireAvatar ?? false;
  const manualState = (settings as any).antiraidManualState ?? false;

  // Manual raid mode — action all joins immediately
  if (manualState) {
    await actionMember(member, action);
    logger.info({ guild: guild.id, user: member.id }, "antiraid: manual raid mode — actioned");
    return;
  }

  // Avatar gate
  if (requireAvatar && !member.user.avatar) {
    const ok = await actionMember(member, action);
    if (ok) {
      logger.info({ guild: guild.id, user: member.id }, "antiraid: no avatar — actioned");
      const batch = ageGateBatches.get(`avatar:${guild.id}`);
      const entry = { id: member.id, tag: member.user.tag, ageDays };
      if (batch) {
        batch.users.push(entry);
        batch.count++;
      } else {
        const timer = setTimeout(async () => {
          const b = ageGateBatches.get(`avatar:${guild.id}`);
          if (b) {
            await sendAlert(guild, settings.antiraidLogChannel,
              [`**reason** — no avatar\n**action** — ${action}`, ...b.users.slice(0, 10).map(u => `<@${u.id}>`)],
              `${b.count} avatarless member${b.count !== 1 ? "s" : ""} removed`);
            ageGateBatches.delete(`avatar:${guild.id}`);
          }
        }, 5_000);
        ageGateBatches.set(`avatar:${guild.id}`, { count: 1, users: [entry], timer });
      }
    }
    return;
  }

  // Age gate
  const minAge = settings.antiraidJoinAge ?? 0;
  const isHighRisk = ageDays < 0.5 || (!member.user.avatar && ageDays < Math.max(minAge, 3));
  if (isHighRisk || (minAge > 0 && ageDays < minAge)) {
    const ok = await actionMember(member, action);
    if (ok) {
      logger.info({ guild: guild.id, user: member.id, ageDays: ageDays.toFixed(2) }, `antiraid: age/risk-gated member (${action})`);
      const batchKey = `age:${guild.id}`;
      const existing = ageGateBatches.get(batchKey);
      const entry = { id: member.id, tag: member.user.tag, ageDays };
      if (existing) {
        existing.users.push(entry);
        existing.count++;
      } else {
        const timer = setTimeout(async () => {
          const batch = ageGateBatches.get(batchKey);
          if (batch) {
            const list = batch.users.slice(0, 10).map(u =>
              `<@${u.id}> — ${u.ageDays < 1 ? `${(u.ageDays * 24).toFixed(0)}h old` : `${u.ageDays.toFixed(1)}d old`}`
            ).join("\n");
            await sendAlert(guild, settings.antiraidLogChannel,
              [`**action** — ${action}\n\n${list}`],
              `${batch.count} account${batch.count !== 1 ? "s" : ""} blocked`);
            ageGateBatches.delete(batchKey);
          }
        }, 5_000);
        ageGateBatches.set(batchKey, { count: 1, users: [entry], timer });
      }
    }
    return;
  }

  // Flood detection
  const now = Date.now();
  let track = joinTracker.get(guild.id);
  if (!track || track.resetAt < now) {
    track = { members: [], resetAt: now + WINDOW_MS, raidActioned: false };
    joinTracker.set(guild.id, track);
  }
  track.members.push(member);

  if (track.raidActioned) {
    await actionMember(member, action);
    return;
  }

  const threshold = settings.antiraidThreshold ?? 8;
  const wasPattern = detectUsernamePattern(track.members);

  if (track.members.length < threshold && !wasPattern) return;

  track.raidActioned = true;
  const raiders = [...track.members];
  let actioned = 0;
  await Promise.allSettled(raiders.map(r => actionMember(r, action).then(ok => { if (ok) actioned++; })));

  let didLock = false;
  if (settings.antiraidLockOnRaid) {
    const locked = await lockServer(guild);
    didLock = locked > 0;
    const existing = lockdownTimers.get(guild.id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      await unlockServer(guild).catch(() => {});
      lockdownTimers.delete(guild.id);
      logger.info({ guild: guild.id }, "antiraid: auto-unlocked after 5m");
      await sendAlert(guild, settings.antiraidLogChannel, ["5-minute raid lockdown expired. server is open again."], "lockdown lifted", 0x1e3322);
    }, 5 * 60 * 1000);
    lockdownTimers.set(guild.id, timer);
  }

  logger.warn({ guild: guild.id, raiderCount: actioned, action, didLock, wasPattern }, "antiraid: raid detected and actioned");
  const lines = [
    `**type** — ${wasPattern ? "coordinated raid (name pattern)" : "join flood"}`,
    `**actioned** — ${actioned} members`,
    `**punishment** — ${action}`,
  ];
  if (didLock) lines.push("**lockdown** — active (5 minutes)");
  await sendAlert(guild, settings.antiraidLogChannel, lines, "raid stopped");
}
