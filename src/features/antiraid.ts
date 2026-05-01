import { type GuildMember } from "discord.js";

interface JoinTrack {
  count: number;
  resetAt: number;
}

const joinTracker = new Map<string, JoinTrack>();
const WINDOW_MS = 10_000;

export async function handleAntiraidJoin(
  member: GuildMember,
  settings: { antiraidEnabled: boolean; antiraidThreshold: number; antiraidJoinAge: number }
) {
  if (!settings.antiraidEnabled) return;

  const ageDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
  if (ageDays < settings.antiraidJoinAge) {
    if (member.kickable) {
      await member
        .kick(`Antiraid: account too new (${Math.floor(ageDays)} days)`)
        .catch(() => {});
    }
    return;
  }

  const now = Date.now();
  const cur = joinTracker.get(member.guild.id);
  if (!cur || cur.resetAt < now) {
    joinTracker.set(member.guild.id, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  cur.count++;
  if (cur.count >= settings.antiraidThreshold) {
    if (member.kickable) await member.kick("Antiraid: join flood detected").catch(() => {});
  }
}
