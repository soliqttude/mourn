import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "humans",
  aliases: ["realusers", "nonbots"],
  description: "Show the count of non-bot members.",
  usage: "humans",
  examples: ["humans"],
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const members = await ctx.guild.members.fetch();
    const humans = members.filter(m => !m.user.bot);
    return ctx.reply({
      embeds: [brandEmbed({
        title: "Human Members",
        description: `**${humans.size}** humans out of **${members.size}** total members.`,
        page: "Utility",
      })],
    });
  },
};
