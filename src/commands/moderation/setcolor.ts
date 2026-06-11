import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "setcolor", aliases: ["colorset"], description: "Set the color of a role.", category: "moderation", permission: "mod", guildOnly: true,
  options: [
    { name: "role", description: "Role to recolor", type: ApplicationCommandOptionType.Role, required: true },
    { name: "color", description: "Hex color (e.g. #ff0000) or 'reset'", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole("role");
    const colorStr = (ctx.getString("color", true) ?? ctx.args[1] ?? "").replace("#", "").toLowerCase();
    if (!role) return ctx.reply({ embeds: [errorEmbed("**Role** not found.")] });
    const color = colorStr === "reset" ? 0 : parseInt(colorStr, 16);
    if (colorStr !== "reset" && (isNaN(color) || colorStr.length > 6)) return ctx.reply({ embeds: [errorEmbed("Invalid hex color. Example: `#ff0000` or `reset`")] });
    try {
      await (role as any).setColor(color, `Color set by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Set **${role.name}** color to **#${colorStr === "reset" ? "000000" : colorStr.padStart(6, "0")}**.`)] });
    } catch (e) { return ctx.reply({ embeds: [errorEmbed((e as Error).message.slice(0, 200))] }); }
  },
};
