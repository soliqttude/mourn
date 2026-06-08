import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "massunrole",
  description: "Remove a role from all server members.",
  category: "moderation",
  aliases: ["removeroleall"],
  guildOnly: true,
  userPermissions: ["ManageRoles"],
  options: [{ name: "role", description: "Role to remove", type: ApplicationCommandOptionType.Role, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole ? ctx.getRole("role") : null;
    const roleId = (role as any)?.id ?? ctx.args[0]?.replace(/[<@&>]/g,"");
    if (!roleId) return ctx.reply({ content: "Provide a role.", ephemeral: true } as any);
    await ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`⏳ Removing <@&${roleId}> from all members...`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    const members = await ctx.guild.members.fetch();
    let removed = 0;
    for (const [, member] of members) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId).catch(() => null);
        removed++;
      }
    }
    return ctx.followUp({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Mass Unrole").setDescription(`Removed <@&${roleId}> from **${removed}** members.`).setFooter({ text: config.embedFooter }).setTimestamp()] } as any);
  },
};
