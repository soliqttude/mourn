import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "rolecolor",
  description: "Change a role's color.",
  category: "utility",
  permission: "admin",
  guildOnly: true,
  aliases: ["rolecolour"],
  options: [
    { name: "role", description: "Role to recolor", type: ApplicationCommandOptionType.Role, required: true },
    { name: "color", description: "Hex color (e.g. ff0000)", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole("role");
    const raw = (ctx.getString("color", true) ?? ctx.args[1] ?? "").replace("#", "");
    if (!role) return ctx.reply({ embeds: [errorEmbed("Role not found.")] });
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return ctx.reply({ embeds: [errorEmbed("Provide a valid hex color.")] });
    await role.setColor(`#${raw}` as any);
    return ctx.reply({ embeds: [successEmbed(`Changed **${role.name}** color to **#${raw.toUpperCase()}**.`)] });
  },
};
