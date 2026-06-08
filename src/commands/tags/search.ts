import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "tagsearch",
  description: "Search for tags by keyword.",
  category: "tags",
  aliases: ["searchtag", "findtag"],
  guildOnly: true,
  options: [{ name: "query", description: "Search query", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const query = (ctx.getString("query") ?? ctx.args[0] ?? "").toLowerCase();
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🔍 Tag Search: ${query}`).setDescription("No matching tags found.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
