import {
  PermissionFlagsBits,
  type GuildMember,
  type PermissionResolvable,
} from "discord.js";
import { config } from "../config.js";

export type PermTier = "everyone" | "mod" | "admin" | "owner" | "botowner";

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
