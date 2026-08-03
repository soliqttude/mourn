import { type GuildMember, type TextChannel, type PermissionOverwrites, EmbedBuilder } from "discord.js";
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

// FIX: previously unlockServer() blindly reset SendMessages to `null` (inherit)
// on every channel, wiping out any pre-existing overwrite (e.g. an
// announcements-only channel that was already locked before the raid). Now we
// snapshot each channel's SendMessages value before locking and restore it
// exactly on unlock instead of assuming "null" is always correct.
interface LockdownSnapshot {
  channelId: string;
  previousSendMessages: boolean | null; // null = no explicit overwrite existed
}
const lockdownSnapshots = new Map<string, LockdownSnapshot[]>();

interface AgeGateBatch {
  count: number;
  users: { id: string; tag: string; ageDays: number }[];
  timer: ReturnType<typeof setTimeout>;
}
const ageGateBatches = new Map<string, AgeGateBatch>();

// ─── Periodic cleanup ─────────────────────────────────────────────────────────
// joinTracker entries (each holding full GuildMember refs) previously stuck
// around forever on quiet servers unless overwritten by a later join. Sweep
// expired windows every 5 minutes.
const SWEEP_INTERVAL_MS = 5 * 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, track] of joinTracker) {
    if (track.resetAt < now) joinTracker.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref();

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
  const snapshot: LockdownSnapshot[] = [];
  for (const [, ch] of channels) {
    try {
      const overwrite = (ch as any).permissionOverwrites.cache.get(everyone.id) as PermissionOverwrites | undefined;
      // Record what SendMessages was set to before we touch it: true (allowed),
      // false (denied), or null (no explicit overwrite at all).
      const previous = overwrite
        ? (overwrite.allow.has("SendMessages") ? true : overwrite.deny.has("SendMessages") ? false : null)
        : null;
      snapshot.push({ channelId: ch.id, previousSendMessages: previous });
      await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: false });
      count++;
    } catch {}
  }
  lockdownSnapshots.set(guild.id, snapshot);
  return count;
}

async function unlockServer(guild: GuildMember["guild"]): Promise<void> {
  const everyone = guild.roles.everyone;
  const snapshot = lockdownSnapshots.get(guild.id);
  lockdownSnapshots.delete(guild.id);

  if (!snapshot) {
    // No snapshot available (e.g. bot restarted mid-lockdown) — fall back to
    // clearing the overwrite entirely, same as previous behavior.
    const channels = guild.channels.cache.filter(c => c.isTextBased() && c.type !== 11 && c.type !== 12);
    for (const [, ch] of channels) {
      try { await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: null }); }
      catch {}
    }
    return;
  }

  for (const entry of snapshot) {
    const ch = guild.channels.cache.get(entry.channelId);
    if (!ch?.isTextBased()) continue;
    try {
      await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: entry.previousSendMessages });
    } catch {}
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

// ─── Flood/pattern check, factored out so gated joins can still fall through ──
// FIX: previously, if a gated member's actionMember() call failed (e.g. bot
// lacks permission to kick/ban them due to role hierarchy), the function just
// returned — skipping flood/raid-pattern detection entirely for that member.
// Now every join that reaches here (gated-but-failed, or ungated) is always
// checked against the flood tracker.
async function checkFlood(member: GuildMember, settings: any): Promise<void> {
  const guild = member.guild;
  const action = settings.antiraidAction ?? "kick";
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
      return;
    }
    // action failed (e.g. hierarchy) — fall through to flood detection instead of exiting silently
    await checkFlood(member, settings);
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
      return;
    }
    // action failed (e.g. hierarchy) — fall through to flood detection instead of exiting silently
    await checkFlood(member, settings);
    return;
  }

  // Flood detection
  await checkFlood(member, settings);
}
