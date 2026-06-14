import {
  PermissionFlagsBits,
  type GuildMember,
  type PermissionResolvable,
} from "discord.js";
import { config } from "../config.js";

export type PermTier =
  | "everyone"
  | "administrator"
  | "ban_members"
  | "kick_members"
  | "manage_guild"
  | "manage_channels"
  | "manage_roles"
  | "manage_messages"
  | "view_audit_log"
  | "manage_webhooks"
  | "manage_expressions"
  | "mute_members"
  | "deafen_members"
  | "move_members"
  | "manage_nicknames"
  | "mention_everyone"
  | "view_guild_insights"
  | "external_emojis"
  | "change_nickname"
  | "moderate_members"
  | "mod"
  | "admin"
  | "owner"
  | "botowner";

const DISCORD_PERM_MAP: Partial<Record<PermTier, bigint>> = {
  administrator:       PermissionFlagsBits.Administrator,
  ban_members:         PermissionFlagsBits.BanMembers,
  kick_members:        PermissionFlagsBits.KickMembers,
  manage_guild:        PermissionFlagsBits.ManageGuild,
  manage_channels:     PermissionFlagsBits.ManageChannels,
  manage_roles:        PermissionFlagsBits.ManageRoles,
  manage_messages:     PermissionFlagsBits.ManageMessages,
  view_audit_log:      PermissionFlagsBits.ViewAuditLog,
  manage_webhooks:     PermissionFlagsBits.ManageWebhooks,
  manage_expressions:  PermissionFlagsBits.ManageEmojisAndStickers,
  mute_members:        PermissionFlagsBits.MuteMembers,
  deafen_members:      PermissionFlagsBits.DeafenMembers,
  move_members:        PermissionFlagsBits.MoveMembers,
  manage_nicknames:    PermissionFlagsBits.ManageNicknames,
  mention_everyone:    PermissionFlagsBits.MentionEveryone,
  view_guild_insights: PermissionFlagsBits.ViewGuildInsights,
  external_emojis:     PermissionFlagsBits.UseExternalEmojis,
  change_nickname:     PermissionFlagsBits.ChangeNickname,
  moderate_members:    PermissionFlagsBits.ModerateMembers,
};

export function isBotOwner(userId: string): boolean {
  return config.ownerIds.has(userId);
}

export function isServerOwner(member: GuildMember): boolean {
  return member.guild.ownerId === member.id;
}

export function hasModPerms(member: GuildMember): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.BanMembers) ||
    member.permissions.has(PermissionFlagsBits.KickMembers) ||
    member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages)
  );
}

export function hasAdminPerms(member: GuildMember): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

export function checkTier(member: GuildMember, required: PermTier): boolean {
  if (required === "everyone") return true;
  if (required === "botowner") return isBotOwner(member.id);
  if (isBotOwner(member.id)) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (isServerOwner(member)) return true;

  // Direct Discord permission check
  const discordPerm = DISCORD_PERM_MAP[required];
  if (discordPerm !== undefined) return member.permissions.has(discordPerm);

  // Legacy tier fallback
  if (required === "owner") return isServerOwner(member);
  if (required === "admin") return hasAdminPerms(member);
  if (required === "mod") return hasModPerms(member) || hasAdminPerms(member);
  return false;
}

export function memberHas(
  member: GuildMember,
  perm: PermissionResolvable
): boolean {
  return member.permissions.has(perm);
}
