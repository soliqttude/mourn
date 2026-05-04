import { type GuildMember, type TextChannel, EmbedBuilder } from "discord.js";
import { logger } from "../lib/logger.js";

interface JoinWindow {
  members: GuildMember[];
  resetAt: number;
  raidActioned: boolean; // prevent double-alert
}

const joinTracker = new Map<string, JoinWindow>();
const WINDOW_MS = 10_000;

// Active lockdown timers: guildId -> timeout handle
const lockdownTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ── Helpers ────────────────────────────────────────────────────────────────

async function actionMember(member: GuildMember, action: string): Promise<boolean> {
  try {
    if (action === "ban") {
      if (member.bannable) {
        await member.ban({ reason: "🛡️ Anti-Raid: join flood" });
        return true;
      }
    } else if (action === "timeout") {
      if (member.moderatable) {
        await member.timeout(10 * 60 * 1000, "🛡️ Anti-Raid: join flood");
        return true;
      }
    } else {
      // kick (default)
      if (member.kickable) {
        await member.kick("🛡️ Anti-Raid: join flood");
        return true;
      }
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
    try {
      await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: false });
      count++;
    } catch {}
  }
  return count;
}

async function unlockServer(guild: GuildMember["guild"]): Promise<void> {
  const everyone = guild.roles.everyone;
  const channels = guild.channels.cache.filter(
    (c) => c.isTextBased() && c.type !== 11 && c.type !== 12,
  );
  for (const [, ch] of channels) {
    try {
      await (ch as any).permissionOverwrites.edit(everyone, { SendMessages: null });
    } catch {}
  }
}

async function sendAlert(
  guild: GuildMember["guild"],
  logChannelId: string | null | undefined,
  actioned: number,
  action: string,
  didLock: boolean,
): Promise<void> {
  const chId = logChannelId ?? guild.systemChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
  if (!ch?.isTextBased()) return;
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("🚨 Raid Detected & Stopped")
    .setDescription(
      `A **join flood** was detected and blocked!\n\n` +
      `**Members actioned:** ${actioned}\n` +
      `**Punishment:** \`${action}\`\n` +
      (didLock
        ? `**Server locked** for 5 minutes to stop further raiding.\n`
        : "") +
      `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    )
    .setFooter({ text: "Anti-Raid System" })
    .setTimestamp();
  await ch.send({ embeds: [embed] }).catch(() => {});
}

// ── Main handler (called from guildMemberAdd) ─────────────────────────────

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

  // ── 1. Age gate ──────────────────────────────────────────────────────────
  const ageDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
  if (settings.antiraidJoinAge > 0 && ageDays < settings.antiraidJoinAge) {
    const ok = await actionMember(member, action);
    if (ok) {
      logger.info(
        { guild: guild.id, user: member.id, ageDays: ageDays.toFixed(1) },
        `antiraid: age-gated member (${action})`,
      );
      // Alert in log channel for every age-gate hit
      const chId = settings.antiraidLogChannel ?? guild.systemChannelId;
      if (chId) {
        const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
        if (ch?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle("⚠️ Anti-Raid: New Account Blocked")
            .setDescription(
              `<@${member.id}> (\`${member.user.tag}\`) was **${action}ed**.\n` +
              `**Account age:** ${ageDays.toFixed(1)} days (min: ${settings.antiraidJoinAge}d)\n` +
              `**Account created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
          await ch.send({ embeds: [embed] }).catch(() => {});
        }
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

  const threshold = settings.antiraidThreshold;

  // If already raiding, action new arrivals immediately
  if (track.raidActioned) {
    await actionMember(member, action);
    return;
  }

  if (track.members.length < threshold) return;

  // ── 3. Threshold crossed — action ALL members in window ──────────────────
  track.raidActioned = true;
  const raiders = [...track.members];
  let actioned = 0;
  const results = await Promise.allSettled(
    raiders.map((r) => actionMember(r, action).then((ok) => { if (ok) actioned++; })),
  );
  results; // just drain

  // ── 4. Optional lockdown ─────────────────────────────────────────────────
  let didLock = false;
  if (settings.antiraidLockOnRaid) {
    const locked = await lockServer(guild);
    didLock = locked > 0;

    // Clear any existing unlock timer
    const existing = lockdownTimers.get(guild.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      await unlockServer(guild).catch(() => {});
      lockdownTimers.delete(guild.id);
      logger.info({ guild: guild.id }, "antiraid: auto-unlocked server after 5m");

      // Notify that server unlocked
      const chId = settings.antiraidLogChannel ?? guild.systemChannelId;
      if (chId) {
        const ch = guild.channels.cache.get(chId) as TextChannel | undefined;
        if (ch?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("✅ Server Unlocked")
            .setDescription("The 5-minute raid lockdown has expired. Server is now open again.")
            .setTimestamp();
          await ch.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }, 5 * 60 * 1000);
    lockdownTimers.set(guild.id, timer);
  }

  logger.warn(
    { guild: guild.id, raiderCount: actioned, action, didLock },
    "antiraid: raid detected and actioned",
  );
  await sendAlert(guild, settings.antiraidLogChannel, actioned, action, didLock);
}
