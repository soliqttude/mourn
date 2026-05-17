import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "roles",
  aliases: ["serverroles", "allroles"],
  description: "List all roles in the server.",
  usage: "roles",
  examples: ["roles"],
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const roles = ctx.guild.roles.cache
      .filter(r => r.id !== ctx.guild!.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString())
      .slice(0, 40);
    return ctx.reply({
      embeds: [brandEmbed({
        title: `Roles — ${ctx.guild.roles.cache.size - 1}`,
        description: roles.join(", ") || "No roles.",
        page: "Utility",
      })],
    });
  },
};
