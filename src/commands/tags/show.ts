import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "tag",
  description: "Show a tag's content.",
  category: "tags",
  aliases: ["t", "showtag"],
  guildOnly: true,
  options: [{ name: "name", description: "Tag name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`Tag **${name}** not found or tag system is being set up.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
