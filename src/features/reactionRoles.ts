import {
  type Client,
  type MessageReaction,
  type User,
  type GuildMember,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { reactionRoles, reactionRoleMessages } from "../db/schema.js";

export async function addReactionRole(
  guildId: string,
  channelId: string,
  messageId: string,
  emoji: string,
  roleId: string
) {
  await db
    .insert(reactionRoleMessages)
    .values({ guildId, channelId, messageId })
    .onConflictDoNothing();
  await db
    .insert(reactionRoles)
    .values({ guildId, channelId, messageId, emoji, roleId })
    .onConflictDoUpdate({
      target: [reactionRoles.messageId, reactionRoles.emoji],
      set: { roleId },
    });
}

export async function removeReactionRole(messageId: string, emoji: string) {
  await db
    .delete(reactionRoles)
    .where(
      and(eq(reactionRoles.messageId, messageId), eq(reactionRoles.emoji, emoji))
    );
}

async function findRoleForReaction(reaction: MessageReaction) {
  const emoji = reaction.emoji.name ?? "";
  const rows = await db
    .select()
    .from(reactionRoles)
    .where(
      and(
        eq(reactionRoles.messageId, reaction.message.id),
        eq(reactionRoles.emoji, emoji)
      )
    );
  return rows[0] ?? null;
}

export async function handleReactionRoleAdd(
  _client: Client,
  reaction: MessageReaction,
  user: User
) {
  if (!reaction.message.guild) return;
  const row = await findRoleForReaction(reaction);
  if (!row) return;
  const member = (await reaction.message.guild.members.fetch(user.id).catch(() => null)) as
    | GuildMember
    | null;
  if (!member) return;
  await member.roles.add(row.roleId).catch(() => {});
}

export async function handleReactionRoleRemove(
  _client: Client,
  reaction: MessageReaction,
  user: User
) {
  if (!reaction.message.guild) return;
  const row = await findRoleForReaction(reaction);
  if (!row) return;
  const member = (await reaction.message.guild.members.fetch(user.id).catch(() => null)) as
    | GuildMember
    | null;
  if (!member) return;
  await member.roles.remove(row.roleId).catch(() => {});
}
