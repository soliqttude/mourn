import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "rmute",
  aliases: [],
  description: "Prevent a user from adding reactions.",
  usage: "rmute <member> [reason]",
  examples: ["rmute @mmoudder rule violation"],
  category: "moderation",
  permission: "moderate_members",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to reaction-mute", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    const reason = (ctx.getString("reason") ?? ctx.args.slice(1).join(" ")) || "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    const botMember = ctx.guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) return ctx.reply({ embeds: [errorEmbed("I need **Manage Roles** to change channel permissions.")] });
    const results = await Promise.all(ctx.guild.channels.cache
      .filter((channel) => channel.isTextBased())
      .map((channel) => (channel as any).permissionOverwrites.edit(target.id, { AddReactions: false, UseExternalEmojis: false }, reason)
        .then(() => true)
        .catch(() => false)));
    const updated = results.filter(Boolean).length;
    if (!updated) return ctx.reply({ embeds: [errorEmbed("I couldn't update any channel permissions. Check my **Manage Roles** permission and role hierarchy.")] });
    return ctx.reply({ embeds: [successEmbed(`Reaction-muted **${target.user.tag}** — ${reason}`)] });
  },
};
