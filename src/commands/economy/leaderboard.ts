import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "leaderboard",
  description: "View the richest members in this server.",
  category: "economy",
  aliases: ["lb", "rich", "top"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const rows = await getLeaderboard(ctx.guild.id, 10);
    if (!rows.length) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("No economy data yet.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    const lines = await Promise.all(rows.map(async (r, i) => {
      const user = await ctx.client.users.fetch(r.userId).catch(() => null);
      const net = r.balance + r.bank;
      return `${i + 1}. **${user?.username ?? r.userId}** — ${formatCoins(net)} coins`;
    }));
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("💰 Economy Leaderboard").setDescription(lines.join("\n")).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
