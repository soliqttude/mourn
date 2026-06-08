import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";

const KEY_PERMS: [bigint, string][] = [
  [PermissionFlagsBits.Administrator,     "Administrator"],
  [PermissionFlagsBits.ManageGuild,       "Manage Server"],
  [PermissionFlagsBits.ManageRoles,       "Manage Roles"],
  [PermissionFlagsBits.ManageChannels,    "Manage Channels"],
  [PermissionFlagsBits.KickMembers,       "Kick Members"],
  [PermissionFlagsBits.BanMembers,        "Ban Members"],
  [PermissionFlagsBits.MuteMembers,       "Mute Members"],
  [PermissionFlagsBits.ManageMessages,    "Manage Messages"],
  [PermissionFlagsBits.MentionEveryone,   "Mention Everyone"],
  [PermissionFlagsBits.ManageNicknames,   "Manage Nicknames"],
  [PermissionFlagsBits.ManageWebhooks,    "Manage Webhooks"],
  [PermissionFlagsBits.ManageExpressions, "Manage Expressions"],
  [PermissionFlagsBits.ModerateMembers,   "Timeout Members"],
];

function fmt(d: Date): string {
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const yr = d.getUTCFullYear();
  let h = d.getUTCHours();
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${mo}/${da}/${yr}, ${h}:${mi} ${ap}`;
}

function rel(d: Date): string {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  const years = Math.floor(days / 365);
  const months = Math.floor(days / 30);
  if (years > 0) return `${years} year${years !== 1 ? "s" : ""} ago`;
  if (months > 0) return `${months} month${months !== 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const mins = Math.floor(diff / 60_000);
  return mins > 0 ? `${mins} minute${mins !== 1 ? "s" : ""} ago` : "just now";
}

export const command: HybridCommand = {
  name: "userinfo",
  aliases: ["whois", "ui"],
  description: "Show information about a user.",
  usage: "userinfo [user]",
  examples: ["userinfo", "userinfo @user"],
  category: "utility",
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const member = ctx.guild
      ? await ctx.guild.members.fetch(target.id).catch(() => null)
      : null;

    const lines: string[] = [];

    lines.push("**Dates**");
    lines.push(`**Created**: ${fmt(target.createdAt)} (${rel(target.createdAt)})`);
    if (member?.joinedAt) {
      lines.push(`**Joined**: ${fmt(member.joinedAt)} (${rel(member.joinedAt)})`);
    }

    if (member && member.roles.cache.size > 1) {
      const roles = member.roles.cache
        .filter((r) => r.id !== member.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => `<@&${r.id}>`);
      const count = roles.length;
      const MAX = 8;
      const shown = roles.slice(0, MAX);
      lines.push("");
      lines.push(`**Roles (${count})**`);
      lines.push(shown.join(", ") + (count > MAX ? "..." : ""));
    }

    if (member) {
      const perms = KEY_PERMS
        .filter(([flag]) => member.permissions.has(flag))
        .map(([, label]) => label);
      if (perms.length) {
        lines.push("");
        lines.push("**Key Permissions**");
        lines.push(perms.join(", "));
      }
    }

    let footerParts: string[] = [];

    if (member?.joinedAt && ctx.guild) {
      try {
        const all = await ctx.guild.members.fetch();
        const sorted = [...all.values()]
          .filter((m) => m.joinedAt)
          .sort((a, b) => a.joinedAt!.getTime() - b.joinedAt!.getTime());
        const pos = sorted.findIndex((m) => m.id === target.id) + 1;
        if (pos > 0) footerParts.push(`Join position: ${pos}`);
      } catch { /* skip */ }
    }

    let mutual = 0;
    for (const guild of ctx.client.guilds.cache.values()) {
      if (guild.members.cache.has(target.id)) mutual++;
    }
    if (mutual > 0) footerParts.push(`${mutual} mutual server${mutual !== 1 ? "s" : ""}`);

    const eb = new EmbedBuilder()
      .setAuthor({ name: `${target.username} (${target.id})` })
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(lines.join("\n"));

    if (footerParts.length) eb.setFooter({ text: footerParts.join(" • ") });

    return ctx.reply({ embeds: [eb] });
  },
};
