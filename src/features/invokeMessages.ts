import { type Guild, type User, type TextChannel } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { invokeMessages } from "../db/schema.js";
import { parseScript, type ScriptingContext } from "../lib/scripting.js";
import { logger } from "../lib/logger.js";

const cache = new Map<string, { command: string; type: string; content: string }[]>();

export function invalidateInvokeCache(guildId: string) {
  cache.delete(guildId);
}

async function getInvokes(guildId: string) {
  if (cache.has(guildId)) return cache.get(guildId)!;
  const rows = await db.select().from(invokeMessages).where(eq(invokeMessages.guildId, guildId));
  cache.set(guildId, rows);
  return rows;
}

export async function getInvokeMessage(
  guildId: string,
  command: string,
  type: "message" | "dm"
): Promise<string | null> {
  const rows = await getInvokes(guildId).catch(() => []);
  return rows.find(r => r.command === command && r.type === type)?.content ?? null;
}

export async function sendInvokeMessages(opts: {
  guildId: string;
  command: string;
  target: User;
  moderator: User;
  guild: Guild;
  channel?: TextChannel | null;
  extra?: Record<string, string>;
}): Promise<void> {
  const { guildId, command, target, moderator, guild, channel, extra } = opts;
  const rows = await getInvokes(guildId).catch(() => []);
  const matching = rows.filter(r => r.command === command);
  if (!matching.length) return;

  const ctx: ScriptingContext = {
    user: target,
    guild,
    extra: {
      "{moderator}": moderator.username,
      "{moderator.mention}": `<@${moderator.id}>`,
      "{moderator.id}": moderator.id,
      "{moderator.tag}": moderator.tag,
      "{channel}": channel ? `<#${channel.id}>` : "unknown",
      ...extra,
    },
  };

  for (const row of matching) {
    const { embeds, content, components } = parseScript(row.content, ctx);
    if (row.type === "dm") {
      await target.send({ content, embeds, components: components as any[] }).catch(() => {});
    } else if (row.type === "message" && channel) {
      await channel.send({ content, embeds, components: components as any[] }).catch(() => {});
    }
  }
}

// Legacy compat export
export async function sendInvokeMessage(opts: {
  guildId: string;
  command: string;
  target: User;
  moderator: User;
  guild: Guild;
  extra?: Record<string, string>;
}): Promise<void> {
  return sendInvokeMessages({ ...opts, channel: null });
}
