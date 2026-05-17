import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "setadmin",
  aliases: ["adminrole", "setadminrole"],
  description: "Give or remove the admin role from a member.",
  category: "moderation",
  permission: "owner",
  guildOnly: true,
  options: [
    { name: "user", description: "Member", type: ApplicationCommandOptionType.User, required: true },
    { name: "role", description: "Admin role to assign/remove", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    const role = ctx.getRole("role");
    if (!target || !role) return ctx.reply({ embeds: [errorEmbed("Invalid input.")] });
    if (target.roles.cache.has(role.id)) {
      await target.roles.remove(role);
      return ctx.reply({ embeds: [successEmbed(`Removed **${role.name}** from **${target.user.tag}**.`)] });
    } else {
      await target.roles.add(role);
      return ctx.reply({ embeds: [successEmbed(`Gave **${role.name}** to **${target.user.tag}**.`)] });
    }
  },
};
