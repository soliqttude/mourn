import {
  type Guild,
  type GuildMember,
  type Role,
  type GuildTextBasedChannel,
  type User,
  type Client,
} from "discord.js";

const ID_RE = /^\d{15,21}$/;
const USER_MENTION_RE = /^<@!?(\d{15,21})>$/;
const ROLE_MENTION_RE = /^<@&(\d{15,21})>$/;
const CHANNEL_MENTION_RE = /^<#(\d{15,21})>$/;

export function extractId(input: string): string | null {
  if (ID_RE.test(input)) return input;
  const u = input.match(USER_MENTION_RE);
  if (u) return u[1];
  const r = input.match(ROLE_MENTION_RE);
  if (r) return r[1];
  const c = input.match(CHANNEL_MENTION_RE);
  if (c) return c[1];
  return null;
}

export async function resolveUser(
  client: Client,
  input: string
): Promise<User | null> {
  const id = extractId(input);
  if (!id) return null;
  try {
    return await client.users.fetch(id);
  } catch {
    return null;
  }
}

export async function resolveMember(
  guild: Guild,
  input: string
): Promise<GuildMember | null> {
  const id = extractId(input);
  if (id) {
    try {
      return await guild.members.fetch(id);
    } catch {
      return null;
    }
  }
  const lower = input.toLowerCase();
  const cached = guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase() === lower ||
      m.displayName.toLowerCase() === lower ||
      (m.nickname?.toLowerCase() ?? "") === lower
  );
  return cached ?? null;
}

export function resolveRole(guild: Guild, input: string): Role | null {
  const id = extractId(input);
  if (id) return guild.roles.cache.get(id) ?? null;
  const lower = input.toLowerCase();
  return (
    guild.roles.cache.find((r) => r.name.toLowerCase() === lower) ?? null
  );
}

export function resolveChannel(
  guild: Guild,
  input: string
): GuildTextBasedChannel | null {
  const id = extractId(input);
  if (id) {
    const ch = guild.channels.cache.get(id);
    if (ch && ch.isTextBased() && !ch.isDMBased()) {
      return ch as GuildTextBasedChannel;
    }
    return null;
  }
  const lower = input.toLowerCase().replace(/^#/, "");
  const ch = guild.channels.cache.find(
    (c) => c.name.toLowerCase() === lower && c.isTextBased() && !c.isDMBased()
  );
  return (ch as GuildTextBasedChannel) ?? null;
}

export function splitArgs(input: string): string[] {
  if (!input.trim()) return [];
  return input.trim().split(/\s+/);
}
