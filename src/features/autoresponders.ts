import { eq } from "drizzle-orm";
import type { Client, Message, GuildMember } from "discord.js";
import { db } from "../db/index.js";
import { autoresponders } from "../db/schema.js";
import { parseScript, type ScriptingContext } from "../lib/scripting.js";

export async function addAutoresponder(
  guildId: string,
  trigger: string,
  response: string,
  matchType: "contains" | "exact" | "starts" = "contains",
  createdBy = "unknown"
) {
  return db.insert(autoresponders).values({ guildId, trigger: trigger.toLowerCase(), response, matchType, createdBy });
}

export async function removeAutoresponder(id: number) {
  const rows = await db.delete(autoresponders).where(eq(autoresponders.id, id)).returning();
  return rows[0] ?? null;
}

export async function listAutoresponders(guildId: string) {
  return db.select().from(autoresponders).where(eq(autoresponders.guildId, guildId));
}

export async function updateAutoresponderExclusive(
  id: number,
  channelId: string | null,
  roleId: string | null
) {
  return db.update(autoresponders)
    .set({ exclusiveChannelId: channelId, exclusiveRoleId: roleId })
    .where(eq(autoresponders.id, id));
}

export async function updateAutoresponderRoles(
  id: number,
  roleAdd: string | null,
  roleRemove: string | null
) {
  return db.update(autoresponders)
    .set({ rewardRoleAdd: roleAdd, rewardRoleRemove: roleRemove })
    .where(eq(autoresponders.id, id));
}

export async function handleAutoresponders(client: Client, message: Message) {
  if (!message.guild || message.author.bot) return;
  const list = await listAutoresponders(message.guild.id);
  if (list.length === 0) return;
  const lower = message.content.toLowerCase();
  const member = message.member as GuildMember | null;

  for (const ar of list) {
    let match = false;
    if (ar.matchType === "exact") match = lower === ar.trigger;
    else if (ar.matchType === "starts") match = lower.startsWith(ar.trigger);
    else match = lower.includes(ar.trigger);

    if (!match) continue;

    // Check exclusive channel restriction
    if (ar.exclusiveChannelId && message.channelId !== ar.exclusiveChannelId) continue;

    // Check exclusive role restriction
    if (ar.exclusiveRoleId && member && !member.roles.cache.has(ar.exclusiveRoleId)) continue;

    // Parse the response with scripting
    const ctx: ScriptingContext = { user: message.member ?? message.author, guild: message.guild };
    const { embeds, content, components } = parseScript(ar.response, ctx);

    const replyContent = content || undefined;
    await message.reply({
      content: replyContent,
      embeds,
      components: components as any[],
      allowedMentions: { parse: [] },
    }).catch(() => {});

    // Handle role rewards
    if (member) {
      if (ar.rewardRoleAdd) {
        await member.roles.add(ar.rewardRoleAdd, "autoresponder role reward").catch(() => {});
      }
      if (ar.rewardRoleRemove) {
        await member.roles.remove(ar.rewardRoleRemove, "autoresponder role removal").catch(() => {});
      }
    }

    break;
  }
}
