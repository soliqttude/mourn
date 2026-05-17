import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "role",
  aliases: ["giverole", "gr", "addrole"],
  description: "Add or remove a role from a member.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "Member", type: ApplicationCommandOptionType.User, required: true },
    { name: "role", description: "Role", type: ApplicationCommandOptionType.Role, required: true },
  ],
  async execute(ctx) {
    const target = await ctx.getMember("user", true);
    const role = ctx.getRole("role");
    if (!target || !role) return ctx.reply({ embeds: [errorEmbed("Member or role missing.")] });
    if (!ctx.guild?.members.me?.permissions.has("ManageRoles")) {
      return ctx.reply({ embeds: [errorEmbed("I lack Manage Roles permission.")] });
    }
    if (role.position >= (ctx.guild.members.me?.roles.highest.position ?? 0)) {
      return ctx.reply({ embeds: [errorEmbed("That role is above my highest role.")] });
    }
    try {
      if (target.roles.cache.has(role.id)) {
        await target.roles.remove(role.id);
        return ctx.reply({ embeds: [successEmbed(`Removed <@&${role.id}> from <@${target.id}>.`)] });
      }
      await target.roles.add(role.id);
      return ctx.reply({ embeds: [successEmbed(`Added <@&${role.id}> to <@${target.id}>.`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
