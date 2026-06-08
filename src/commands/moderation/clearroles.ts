import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "clearroles",
  description: "Remove all non-managed roles from a member.",
  category: "moderation",
  aliases: ["stripperms","removeroles"],
  guildOnly: true,
  userPermissions: ["ManageRoles"],
  options: [{ name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    if (!target) return ctx.reply({ content: "Provide a user.", ephemeral: true } as any);
    const member = await ctx.guild.members.fetch(target.id).catch(() => null);
    if (!member) return ctx.reply({ content: "Member not found.", ephemeral: true } as any);
    const toRemove = member.roles.cache.filter(r => !r.managed && r.id !== ctx.guild!.id).map(r => r.id);
    await member.roles.remove(toRemove, `Roles cleared by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Roles Cleared").setDescription(`Removed **${toRemove.length}** role(s) from **${target.username}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
