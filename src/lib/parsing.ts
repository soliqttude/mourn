import { type Guild, type GuildMember, type Role, type GuildTextBasedChannel, type User, type Client } from "discord.js";

const ID_RE = /^\d{15,21}$/;
const USER_MENTION_RE = /^<@!?(\d{15,21})>$/;
const ROLE_MENTION_RE = /^<@&(\d{15,21})>$/;
const CHANNEL_MENTION_RE = /^<#(\d{15,21})>$/;

export function extractId(input: string): string | null {
  if (ID_RE.test(input)) return input;
  const u = input.match(USER_MENTION_RE); if (u) return u[1];
  const r = input.match(ROLE_MENTION_RE); if (r) return r[1];
  const c = input.match(CHANNEL_MENTION_RE); if (c) return c[1];
  return null;
}

const normalize = (s: string) => s.trim().replace(/^@/, "").replace(/^<@!?/, "").replace(/>$/, "").toLowerCase();

function cachedMember(guild: Guild, q: string): GuildMember | null {
  const all = [...guild.members.cache.values()];
  const exact = all.filter(m => m.user.username.toLowerCase() === q || (m.user.globalName ?? "").toLowerCase() === q || m.displayName.toLowerCase() === q);
  if (exact.length) return exact.length === 1 ? exact[0]! : null;
  const partial = all.filter(m => m.user.username.toLowerCase().includes(q) || (m.user.globalName ?? "").toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q));
  return partial.length === 1 ? partial[0]! : null;
}

export async function resolveUser(client: Client, input: string, guild?: Guild | null): Promise<User | null> {
  const id = extractId(input.trim());
  if (id) { try { return await client.users.fetch(id); } catch { return null; } }
  const q = normalize(input);
  if (!q || !guild) return null;
  const cached = cachedMember(guild, q);
  if (cached) return cached.user;
  try {
    const results = await guild.members.fetch({ query: q, limit: 10 });
    const matches = [...results.values()].filter(m =>
      m.user.username.toLowerCase() === q || (m.user.globalName ?? "").toLowerCase() === q || m.displayName.toLowerCase() === q ||
      m.user.username.toLowerCase().startsWith(q) || (m.user.globalName ?? "").toLowerCase().startsWith(q) || m.displayName.toLowerCase().startsWith(q)
    );
    return matches.length === 1 ? matches[0]!.user : null;
  } catch { return null; }
}

export async function resolveMember(guild: Guild, input: string): Promise<GuildMember | null> {
  const id = extractId(input);
  if (id) { try { return await guild.members.fetch(id); } catch { return null; } }
  const q = normalize(input);
  if (!q) return null;
  const cached = cachedMember(guild, q);
  if (cached) return cached;
  try {
    const results = await guild.members.fetch({ query: q, limit: 10 });
    const matches = [...results.values()].filter(m =>
      m.user.username.toLowerCase() === q || (m.user.globalName ?? "").toLowerCase() === q || m.displayName.toLowerCase() === q ||
      m.user.username.toLowerCase().startsWith(q) || (m.user.globalName ?? "").toLowerCase().startsWith(q) || m.displayName.toLowerCase().startsWith(q)
    );
    return matches.length === 1 ? matches[0]! : null;
  } catch { return null; }
}

export function resolveRole(guild: Guild, input: string): Role | null {
  const id = extractId(input);
  if (id) return guild.roles.cache.get(id) ?? null;
  return guild.roles.cache.find(r => r.name.toLowerCase() === input.toLowerCase()) ?? null;
}

export function resolveChannel(guild: Guild, input: string): GuildTextBasedChannel | null {
  const id = extractId(input);
  if (id) {
    const ch = guild.channels.cache.get(id);
    return ch && ch.isTextBased() && !ch.isDMBased() ? ch as GuildTextBasedChannel : null;
  }
  const lower = input.toLowerCase().replace(/^#/, "");
  const ch = guild.channels.cache.find(c => c.name.toLowerCase() === lower && c.isTextBased() && !c.isDMBased());
  return (ch as GuildTextBasedChannel) ?? null;
}

export function splitArgs(input: string): string[] {
  if (!input.trim()) return [];
  return input.trim().split(/\s+/);
}
