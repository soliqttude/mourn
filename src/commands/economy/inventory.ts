import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "inventory",
  description: "View your purchased items.",
  category: "economy",
  aliases: ["inv", "items", "bag"],
  guildOnly: true,
  options: [
    { name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user") ?? ctx.user;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle(`🎒 ${target.username}'s Inventory`).setDescription("Inventory system coming soon. Items purchased are tracked internally.").setThumbnail(target.displayAvatarURL()).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
