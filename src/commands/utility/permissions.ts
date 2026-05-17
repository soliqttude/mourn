import { ApplicationCommandOptionType, PermissionsBitField } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

const PERMS: [keyof typeof PermissionsBitField.Flags, string][] = [
  ["Administrator", "Administrator"], ["ManageGuild", "Manage Server"],
  ["ManageChannels", "Manage Channels"], ["ManageRoles", "Manage Roles"],
  ["ManageMessages", "Manage Messages"], ["BanMembers", "Ban Members"],
  ["KickMembers", "Kick Members"], ["ModerateMembers", "Timeout Members"],
  ["MentionEveryone", "Mention Everyone"], ["ManageNicknames", "Manage Nicknames"],
  ["ViewAuditLog", "View Audit Log"], ["SendMessages", "Send Messages"],
  ["EmbedLinks", "Embed Links"], ["AttachFiles", "Attach Files"],
  ["UseExternalEmojis", "External Emojis"], ["AddReactions", "Add Reactions"],
];

export const command: HybridCommand = {
  name: "permissions",
  aliases: ["perms", "checkperms"],
  description: "View what permissions a member has in the current channel.",
  usage: "permissions [user]",
  examples: ["permissions"],
  category: "utility",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to check (defaults to you)", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = (await ctx.getMember("user")) ?? ctx.member;
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    const perms = ctx.channel ? target.permissionsIn(ctx.channel) : target.permissions;
    const lines = PERMS.map(([flag, label]) => `${perms.has(flag) ? "✅" : "❌"} ${label}`);
    const half = Math.ceil(lines.length / 2);
    return ctx.reply({
      embeds: [brandEmbed({
        title: `Permissions — ${target.user.tag}`,
        fields: [
          { name: "\u200b", value: lines.slice(0, half).join("\n"), inline: true },
          { name: "\u200b", value: lines.slice(half).join("\n"), inline: true },
        ],
        page: "Utility",
      })],
    });
  },
};
