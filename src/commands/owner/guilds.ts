import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "guilds",
  description: "(Owner only) List all servers the bot is in.",
  usage: "guilds",
  examples: ["guilds"],
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const guilds = [...ctx.client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);
    const totalMembers = guilds.reduce((a, g) => a + g.memberCount, 0);
    let desc = guilds.slice(0, 20).map((g, i) =>
      `\`${i + 1}.\` **${g.name}** — ${g.memberCount.toLocaleString()} members \`${g.id}\``
    ).join("\n");
    if (guilds.length > 20) desc += `\n\n…and **${guilds.length - 20}** more.`;
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`🌐 Servers (${guilds.length})`)
      .setDescription(desc)
      .addFields(
        { name: "Total Members", value: totalMembers.toLocaleString(), inline: true },
        { name: "Total Servers", value: guilds.length.toString(), inline: true },
      )
      .setFooter({ text: config.embedFooter })
      .setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
