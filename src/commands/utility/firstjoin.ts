import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "firstjoin",
  description: "Show the first members to join this server.",
  usage: "firstjoin",
  examples: ["firstjoin"],
  category: "utility",
  guildOnly: true,
  aliases: ["earliest", "oldestembers", "firstmembers"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const members = await ctx.guild.members.fetch();
    const sorted = [...members.values()]
      .filter(m => m.joinedAt)
      .sort((a, b) => a.joinedAt!.getTime() - b.joinedAt!.getTime())
      .slice(0, 10);

    const lines = sorted.map((m, i) => {
      const ts = Math.floor(m.joinedAt!.getTime() / 1000);
      return `**${i + 1}.** ${m.user.tag} — <t:${ts}:D>`;
    });

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle(`🏅 First Members — ${ctx.guild.name}`)
          .setDescription(lines.join("\n"))
          .setThumbnail(ctx.guild.iconURL())
          .setFooter({ text: `${config.embedFooter} • Earliest 10 members` })
          .setTimestamp(),
      ],
    });
  },
};
