import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "richest",
  description: "See who has the most coins in their wallet.",
  category: "economy",
  aliases: ["topwallet"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await getLeaderboard(ctx.guild.id, 5);
    if (!rows.length) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("No economy data yet.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    const lines = await Promise.all(rows.map(async (r, i) => {
      const user = await ctx.client.users.fetch(r.userId).catch(() => null);
      const medal = ["🥇","🥈","🥉","4️⃣","5️⃣"][i];
      return `${medal} **${user?.username ?? r.userId}** — 💰 ${formatCoins(r.balance)} | 🏦 ${formatCoins(r.bank)}`;
    }));
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("🏆 Richest Members").setDescription(lines.join("\n")).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
