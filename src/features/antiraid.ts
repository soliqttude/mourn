import { type GuildMember, type TextChannel, EmbedBuilder } from "discord.js";
import { logger } from "../lib/logger.js";

interface JoinWindow {
  members: GuildMember[];
  resetAt: number;
  raidActioned: boolean;
}

const joinTracker = new Map<string, JoinWindow>();
const WINDOW_MS = 10_000;

// Active lockdown timers: guildId -> timeout handle
const lockdownTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Age-gate burst batching: don't spam log per join, batch alerts every 5s
interface AgeGateBatch {
  count: number;
  users: { id: string; tag: string; ageDays: number }[];
  timer: ReturnType<typeof setTimeout>;
}
const ageGateBatches = new Map<string, AgeGateBatch>();

// ── Helpers ───────────────────────────────────────────────────────────────

async function actionMember(member: GuildMember, action: string): Promise<boolean> {
  try {
    if (action === "ban") {
      if (member.bannable) { await member.ban({ reason: "antiraid: join flood" }); return true; }
    } else if (action === "timeout") {
      if (member.moderatable) { await member.timeout(15 * 60 * 1000, "antiraid: join flood"); return true; }
    } else {
      if (member.kickable) { await member.kick("antiraid: join flood"); return true; }
    }
  } catch {}
  return false;
}

async function lockServer(guild: GuildMember["guild"]): Promise<number> {
  const everyone = guild.roles.everyone;
  const channels = guild.channels.cache.filter(
    (c) => c.isTextBased() && c.type !== 11 && c.type !== 12,
  );
  let count = 0;
  for (const [, ch] of channels) {
    try { await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: false }); count++; }
    catch {}
  }
  return count;
}

async function unlockServer(guild: GuildMember["guild"]): Promise<void> {
  const everyone = guild.roles.everyone;
  const channels = guild.channels.cache.filter(
    (c) => c.isTextBased() && c.type !== 11 && c.type !== 12,
  );
  for (const [, ch] of channels) {
    try { await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: null }); }
    catch {}
  }
}

function detectUsernamePattern(members: GuildMember[]): boolean {
  if (members.length < 3) return false;
  const names = members.map((m) => m.user.username.toLowerCase().replace(/\d+/g, ""));
  const counts = new Map<string, number>();
  for (const name of names) {
    // Check 4-char prefixes
    if (name.length >= 4) {
      const prefix = name.slice(0, 4);
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
  }
  for (const count of counts.values()) {
    if (count >= 3) return true;
  }
  return false;
}

function isHighRisk(member: GuildMember, minAgeDays: number): boolean {
  const ageDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
  // Brand new account (< 12 hours) = instant action regardless of joinage setting
  if (ageDays < 0.5) return true;
  // Default avatar + young account
  const hasDefaultAvatar = !member.user.avatar;
  if (hasDefaultAvatar && ageDays < Math.max(minAgeDays, 3)) return true;
  return false;
}

async function sendFloodAlert(
  guild: GuildMember["guild"],
  logChannelId: string | null | undefined,
  actioned: number,
  action: string,
  didLock: boolean,
  wasPattern: boolean,
): Promise<void> {
  const chId = logChannelId ?? guild.systemChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
  if (!ch?.isTextBased()) return;

  const lines = [
    `**type** — ${wasPattern ? "coordinated raid (name pattern)" : "join flood"}`,
    `**actioned** — ${actioned} members`,
    `**punishment** — ${action}`,
  ];
  if (didLock) lines.push(`**lockdown** — active (5 minutes)`);

  const embed = new EmbedBuilder()
    .setColor(0x1a0600)
    .setAuthor({ name: "antiraid · raid stopped" })
    .setDescription(lines.join("\n"));
  await ch.send({ embeds: [embed] }).catch(() => {});
}

async function sendUnlockAlert(
  guild: GuildMember["guild"],
  logChannelId: string | null | undefined,
): Promise<void> {
  const chId = logChannelId ?? guild.systemChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
  if (!ch?.isTextBased()) return;
  const embed = new EmbedBuilder()
    .setColor(0x1e3322)
    .setAuthor({ name: "antiraid · lockdown lifted" })
    .setDescription("5-minute raid lockdown expired. server is open again.");
  await ch.send({ embeds: [embed] }).catch(() => {});
}

async function sendAgeGateBatchAlert(
  guild: GuildMember["guild"],
  logChannelId: string | null | undefined,
  users: { id: string; tag: string; ageDays: number }[],
  action: string,
): Promise<void> {
  const chId = logChannelId ?? guild.systemChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
  if (!ch?.isTextBased()) return;

  const list = users
    .slice(0, 10)
    .map((u) => `<@${u.id}> — ${u.ageDays < 1 ? `${(u.ageDays * 24).toFixed(0)}h old` : `${u.ageDays.toFixed(1)}d old`}`)
    .join("\n");
  const extra = users.length > 10 ? `\n*…and ${users.length - 10} more*` : "";

  const embed = new EmbedBuilder()
    .setColor(0x1a0600)
    .setAuthor({ name: `antiraid · ${users.length} account${users.length !== 1 ? "s" : ""} blocked` })
    .setDescription(`**punishment** — ${action}\n\n${list}${extra}`);
  await ch.send({ embeds: [embed] }).catch(() => {});
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function handleAntiraidJoin(
  member: GuildMember,
  settings: {
    antiraidEnabled: boolean;
    antiraidThreshold: number;
    antiraidJoinAge: number;
    antiraidAction?: string | null;
    antiraidLogChannel?: string | null;
    antiraidLockOnRaid?: boolean | null;
  },
): Promise<void> {
  if (!settings.antiraidEnabled) return;
  const guild = member.guild;
  const action = settings.antiraidAction ?? "kick";
  const ageDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;

  // ── 1. High-risk fast path (brand new or default avatar + young) ──────────
  const highRisk = isHighRisk(member, settings.antiraidJoinAge);
  if (highRisk || (settings.antiraidJoinAge > 0 && ageDays < settings.antiraidJoinAge)) {
    const ok = await actionMember(member, action);
    if (ok) {
      logger.info(
        { guild: guild.id, user: member.id, ageDays: ageDays.toFixed(2), highRisk },
        `antiraid: age/risk-gated member (${action})`,
      );

      // Batch age-gate alerts to avoid log spam
      const existing = ageGateBatches.get(guild.id);
      const entry = { id: member.id, tag: member.user.tag, ageDays };
      if (existing) {
        existing.users.push(entry);
        existing.count++;
      } else {
        const timer = setTimeout(async () => {
          const batch = ageGateBatches.get(guild.id);
          if (batch) {
            await sendAgeGateBatchAlert(guild, settings.antiraidLogChannel, batch.users, action);
            ageGateBatches.delete(guild.id);
          }
        }, 5_000);
        ageGateBatches.set(guild.id, { count: 1, users: [entry], timer });
      }
    }
    return;
  }

  // ── 2. Flood detection ───────────────────────────────────────────────────
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

  const threshold = settings.antiraidThreshold;
  const wasPattern = detectUsernamePattern(track.members);

  // Trigger on threshold OR username pattern (whichever comes first)
  if (track.members.length < threshold && !wasPattern) return;

  // ── 3. Threshold crossed — action ALL members in window ──────────────────
  track.raidActioned = true;
  const raiders = [...track.members];
  let actioned = 0;
  await Promise.allSettled(
    raiders.map((r) => actionMember(r, action).then((ok) => { if (ok) actioned++; })),
  );

  // ── 4. Optional lockdown ─────────────────────────────────────────────────
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
      await sendUnlockAlert(guild, settings.antiraidLogChannel);
    }, 5 * 60 * 1000);
    lockdownTimers.set(guild.id, timer);
  }

  logger.warn(
    { guild: guild.id, raiderCount: actioned, action, didLock, wasPattern },
    "antiraid: raid detected and actioned",
  );
  await sendFloodAlert(guild, settings.antiraidLogChannel, actioned, action, didLock, wasPattern);
}
