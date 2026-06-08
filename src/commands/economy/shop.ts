import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "shop",
  description: "Browse the server shop.",
  category: "economy",
  aliases: ["store", "market"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const items = [
      { name: "Bank Upgrade", id: "bank_upgrade", cost: 5000, description: "Increases bank cap by 5,000" },
      { name: "Lucky Charm", id: "lucky_charm", cost: 2000, description: "Boosts crime/rob success rate for 24h" },
      { name: "Fishing Rod+", id: "fishing_rod", cost: 1500, description: "Better fishing rewards for 24h" },
      { name: "Pickaxe+", id: "pickaxe", cost: 1500, description: "Better mining rewards for 24h" },
    ];
    const lines = items.map((i, idx) => `**${idx+1}. ${i.name}** — ${formatCoins(i.cost)} coins\n> ${i.description}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("🛒 Server Shop").setDescription(lines.join("\n\n")).setFooter({ text: `Use /buy <item> to purchase • ${config.embedFooter}` }).setTimestamp()] });
  },
};
