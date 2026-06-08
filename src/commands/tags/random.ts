import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "tagrandom",
  description: "Show a random server tag.",
  category: "tags",
  aliases: ["randomtag"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🎲 Random Tag").setDescription("No tags available yet.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
