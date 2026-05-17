import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "unroleall",
  aliases: ["massunrole", "removeroleall"],
  description: "Remove a role from all members.",
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "role", description: "Role to remove", type: ApplicationCommandOptionType.Role, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole("role");
    if (!role) return ctx.reply({ embeds: [errorEmbed("Role not found.")] });
    await ctx.defer();
    const members = await ctx.guild.members.fetch();
    let count = 0;
    for (const [, m] of members) {
      if (m.roles.cache.has(role.id)) {
        await m.roles.remove(role).catch(() => {});
        count++;
      }
    }
    return ctx.reply({ embeds: [successEmbed(`Removed **${role.name}** from **${count}** members.`)] });
  },
};
