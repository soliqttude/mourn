import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";

const permissionNames: Record<string, string> = {
  Administrator: "Administrator", ManageGuild: "Manage Server", ManageChannels: "Manage Channels",
  ManageRoles: "Manage Roles", ManageMessages: "Manage Messages", ModerateMembers: "Moderate Members",
  BanMembers: "Ban Members", KickMembers: "Kick Members", ManageThreads: "Manage Threads",
  ManageWebhooks: "Manage Webhooks", ViewAuditLog: "View Audit Log", ManageNicknames: "Manage Nicknames",
  AttachFiles: "Attach Files", EmbedLinks: "Embed Links", MentionEveryone: "Mention Everyone",
  MoveMembers: "Move Members", MuteMembers: "Mute Members", DeafenMembers: "Deafen Members",
};

export const command: HybridCommand = {
  name: "permissions",
  description: "Inspect a member's permissions in a channel.",
  category: "moderation",
  guildOnly: true,
  userPermissions: ["ManageRoles", "ManageChannels"],
  options: [
    { name: "member", description: "Member to inspect (defaults to you)", type: ApplicationCommandOptionType.User, required: false },
    { name: "channel", description: "Channel to inspect (defaults to this channel)", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const member = await ctx.getMember("member").catch(() => null) ?? ctx.member;
    const channel = ctx.getChannel("channel") ?? ctx.channel;
    if (!member || !channel || !("permissionsFor" in channel)) {
      return ctx.reply({ content: "I couldn't resolve that member or channel.", ephemeral: true });
    }
    const perms = (channel as any).permissionsFor(member);
    if (!perms) return ctx.reply({ content: "Permissions are unavailable for that channel.", ephemeral: true });
    const granted = Object.entries(permissionNames)
      .filter(([key]) => perms.has((PermissionFlagsBits as any)[key]))
      .map(([, label]) => label);
    const denied = Object.entries(permissionNames)
      .filter(([key]) => !perms.has((PermissionFlagsBits as any)[key]))
      .map(([, label]) => label);
    const embed = new EmbedBuilder()
      .setColor(0x8b1e2d)
      .setTitle(`Permissions: ${member.user.tag}`)
      .setDescription(`**Channel:** <#${channel.id}>\n**Granted:** ${granted.join(", ") || "None"}\n\n**Not granted:** ${denied.join(", ") || "None"}`)
      .setFooter({ text: "Channel-specific effective permissions" })
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  },
};
