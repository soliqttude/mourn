import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "leaderboard",
  description: "View the XP leaderboard.",
  category: "levels",
  aliases: ["top", "levels"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle(`🏆 ${ctx.guild.name} Leaderboard`).setDescription("XP leaderboard will display here once XP data has been collected.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
