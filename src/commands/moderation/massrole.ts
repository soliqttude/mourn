import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "massrole",
  description: "Add a role to all server members.",
  category: "moderation",
  aliases: ["addroleall", "giveroleall"],
  guildOnly: true,
  userPermissions: ["ManageRoles"],
  options: [{ name: "role", description: "Role to add", type: ApplicationCommandOptionType.Role, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole ? ctx.getRole("role") : null;
    const roleId = (role as any)?.id ?? ctx.args[0]?.replace(/[<@&>]/g,"");
    if (!roleId) return ctx.reply({ content: "Provide a role.", ephemeral: true } as any);
    const r = ctx.guild.roles.cache.get(roleId);
    if (!r) return ctx.reply({ content: "Role not found.", ephemeral: true } as any);
    await ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`⏳ Adding <@&${roleId}> to all members... This may take a while.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    const members = await ctx.guild.members.fetch();
    let added = 0;
    for (const [, member] of members) {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId).catch(() => null);
        added++;
      }
    }
    return ctx.followUp({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Mass Role").setDescription(`Added <@&${roleId}> to **${added}** members.`).setFooter({ text: config.embedFooter }).setTimestamp()] } as any);
  },
};
