import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "bots",
  aliases: ["botmembers", "robotlist"],
  description: "List all bots in the server.",
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const members = await ctx.guild.members.fetch();
    const bots = members.filter(m => m.user.bot);
    const list = bots.map(b => `**${b.user.username}**`).slice(0, 30).join(", ");
    return ctx.reply({
      embeds: [brandEmbed({
        title: `Bots — ${bots.size}`,
        description: list || "No bots.",
        page: "Utility",
      })],
    });
  },
};
