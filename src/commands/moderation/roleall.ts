import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "roleall",
  aliases: ["massrole", "giveroleall"],
  description: "Give a role to all members.",
  usage: "roleall [role]",
  examples: ["roleall"],
  category: "moderation",
  permission: "manage_roles",
  guildOnly: true,
  options: [{ name: "role", description: "Role to give", type: ApplicationCommandOptionType.Role, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole("role");
    if (!role) return ctx.reply({ embeds: [errorEmbed("**Role** not found.")] });
    await ctx.defer();
    const members = await ctx.guild.members.fetch();
    let count = 0;
    for (const [, m] of members) {
      if (!m.roles.cache.has(role.id)) {
        await m.roles.add(role).catch(() => {});
        count++;
      }
    }
    return ctx.reply({ embeds: [successEmbed(`Gave **${role.name}** to **${count}** members.`)] });
  },
};
