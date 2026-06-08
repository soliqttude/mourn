import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "levelcard",
  description: "View your rank card image.",
  category: "levels",
  aliases: ["rankcard"],
  guildOnly: true,
  options: [{ name: "user", description: "User to view", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user") ?? ctx.user;
    const avatar = target.displayAvatarURL({ extension: "png", size: 512 });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🃏 ${target.username}'s Level Card`).setDescription("Full rank card rendering coming soon.").setThumbnail(avatar).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
