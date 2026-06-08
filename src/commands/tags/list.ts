import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "taglist",
  description: "List all server tags.",
  category: "tags",
  aliases: ["tags", "showtags"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🏷️ ${ctx.guild.name} Tags`).setDescription("No tags yet. Create one with `/tagcreate`.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
