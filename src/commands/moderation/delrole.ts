import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "delrole", aliases: ["deleterole"], description: "Delete a role from the server.", category: "moderation", permission: "admin", guildOnly: true,
  options: [{ name: "role", description: "Role to delete", type: ApplicationCommandOptionType.Role, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole("role");
    if (!role) return ctx.reply({ embeds: [errorEmbed("**Role** not found.")] });
    const name = role.name;
    try {
      await (role as any).delete(`Deleted by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Deleted role **${name}**.`)] });
    } catch (e) { return ctx.reply({ embeds: [errorEmbed((e as Error).message.slice(0, 200))] }); }
  },
};
