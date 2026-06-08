import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "rank",
  description: "View your or another user's rank.",
  category: "levels",
  aliases: ["level", "xp", "lvl"],
  guildOnly: true,
  options: [{ name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user") ?? ctx.user;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`📊 ${target.username}'s Rank`).setDescription("Rank card coming soon. XP tracking is active.").setThumbnail(target.displayAvatarURL()).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
