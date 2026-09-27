import { and, eq } from "drizzle-orm";
import type { Client, GuildMember, GuildTextBasedChannel, Message } from "discord.js";
import { db } from "../db/index.js";
import { config } from "../config.js";
import { autoresponders } from "../db/schema.js";
import { parseScript, type ScriptingContext } from "../lib/scripting.js";

export type AutoresponderOptions = {
  notStrict?: boolean;
  selfDestructSeconds?: number | null;
  deleteTrigger?: boolean;
  reply?: boolean;
  ignoreCommandCheck?: boolean;
};

export async function addAutoresponder(
  guildId: string,
  trigger: string,
  response: string,
  _matchType: "contains" | "exact" | "starts" = "contains",
  createdBy = "unknown",
  options: AutoresponderOptions = {},
) {
  return db.insert(autoresponders).values({
    guildId,
    trigger: trigger.trim().toLowerCase(),
    response,
    matchType: options.notStrict ? "contains" : "exact",
    createdBy,
    notStrict: options.notStrict ?? false,
    selfDestructSeconds: options.selfDestructSeconds ?? null,
    deleteTrigger: options.deleteTrigger ?? false,
    reply: options.reply ?? false,
    ignoreCommandCheck: options.ignoreCommandCheck ?? false,
  });
}

export async function removeAutoresponder(id: number) {
  const rows = await db.delete(autoresponders).where(eq(autoresponders.id, id)).returning();
  return rows[0] ?? null;
}

export async function removeAutoresponderByTrigger(guildId: string, trigger: string) {
  const rows = await listAutoresponders(guildId);
  const target = rows.find((row) => row.trigger === trigger.trim().toLowerCase());
  return target ? removeAutoresponder(target.id) : null;
}

export async function listAutoresponders(guildId: string) {
  return db.select().from(autoresponders).where(eq(autoresponders.guildId, guildId));
}

export async function updateAutoresponder(
  guildId: string,
  trigger: string,
  response: string,
  options: AutoresponderOptions = {},
) {
  const rows = await listAutoresponders(guildId);
  const target = rows.find((row) => row.trigger === trigger.trim().toLowerCase());
  if (!target) return null;
  const [updated] = await db.update(autoresponders)
    .set({
      response,
      matchType: options.notStrict ? "contains" : "exact",
      notStrict: options.notStrict ?? false,
      selfDestructSeconds: options.selfDestructSeconds ?? null,
      deleteTrigger: options.deleteTrigger ?? false,
      reply: options.reply ?? false,
      ignoreCommandCheck: options.ignoreCommandCheck ?? false,
    })
    .where(eq(autoresponders.id, target.id))
    .returning();
  return updated ?? null;
}

export async function resetAutoresponders(guildId: string) {
  return db.delete(autoresponders).where(eq(autoresponders.guildId, guildId));
}

export async function updateAutoresponderExclusive(id: number, channelId: string | null, roleId: string | null) {
  return db.update(autoresponders)
    .set({ exclusiveChannelId: channelId, exclusiveRoleId: roleId })
    .where(eq(autoresponders.id, id));
}

export async function updateAutoresponderRoles(id: number, roleAdd: string | null, roleRemove: string | null) {
  return db.update(autoresponders)
    .set({ rewardRoleAdd: roleAdd, rewardRoleRemove: roleRemove })
    .where(eq(autoresponders.id, id));
}

function isCommandMessage(message: Message) {
  const content = message.content.trim();
  return /^[,!?]\S+/.test(content) || /^,own\s+/i.test(content);
}

export async function handleAutoresponders(client: Client, message: Message) {
  if (!config.databaseEnabled || !message.guild || message.author.bot) return;

  const list = await listAutoresponders(message.guild.id);
  if (!list.length) return;

  const lower = message.content.trim().toLowerCase();
  const member = message.member as GuildMember | null;

  for (const ar of list) {
    if (isCommandMessage(message) && !ar.ignoreCommandCheck) continue;

    const trigger = ar.trigger.toLowerCase();
    const match = ar.notStrict
      ? lower.includes(trigger)
      : lower === trigger;

    if (!match) continue;
    if (ar.exclusiveChannelId && message.channelId !== ar.exclusiveChannelId) continue;
    if (ar.exclusiveRoleId && (!member || !member.roles.cache.has(ar.exclusiveRoleId))) continue;

    const channel = message.channel as GuildTextBasedChannel;

    const scriptingContext: ScriptingContext = {
      user: message.member ?? message.author,
      guild: message.guild,
      channel: channel as unknown as ScriptingContext["channel"],
      client,
    };
    const { embeds, content, components } = parseScript(ar.response, scriptingContext);

    const sent = ar.reply
      ? await message.reply({
          content: content || undefined,
          embeds: embeds.length ? embeds : undefined,
          components: components.length ? components : undefined,
          allowedMentions: { parse: [] },
        }).catch(() => null)
      : await channel.send({
          content: content || undefined,
          embeds: embeds.length ? embeds : undefined,
          components: components.length ? components : undefined,
          allowedMentions: { parse: [] },
        }).catch(() => null);

    if (!sent) continue;

    if (ar.selfDestructSeconds) {
      setTimeout(() => sent.delete().catch(() => {}), ar.selfDestructSeconds * 1000);
    }

    if (ar.deleteTrigger) {
      await message.delete().catch(() => {});
    }

    if (member) {
      if (ar.rewardRoleAdd) await member.roles.add(ar.rewardRoleAdd, "autoresponder role reward").catch(() => {});
      if (ar.rewardRoleRemove) await member.roles.remove(ar.rewardRoleRemove, "autoresponder role removal").catch(() => {});
    }

    break;
  }
}
