import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "buy",
  description: "Buy an item from the shop.",
  category: "economy",
  aliases: ["purchase"],
  guildOnly: true,
  options: [
    { name: "item", description: "Item name or number", type: ApplicationCommandOptionType.String, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const input = (ctx.getString("item") ?? ctx.args[0] ?? "").toLowerCase();
    const items: Record<string, number> = { bank_upgrade: 5000, lucky_charm: 2000, fishing_rod: 1500, pickaxe: 1500, "1": 5000, "2": 2000, "3": 1500, "4": 1500 };
    const names: Record<string, string> = { bank_upgrade: "Bank Upgrade", lucky_charm: "Lucky Charm", fishing_rod: "Fishing Rod+", pickaxe: "Pickaxe+", "1": "Bank Upgrade", "2": "Lucky Charm", "3": "Fishing Rod+", "4": "Pickaxe+" };
    const cost = items[input];
    if (!cost) return ctx.reply({ content: "Unknown item. Check `/shop` for available items.", ephemeral: true } as any);
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    if (eco.balance < cost) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`You need ${formatCoins(cost)} coins. You only have ${formatCoins(eco.balance)}.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    await addBalance(ctx.guild.id, ctx.user.id, -cost);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Purchase Successful").setDescription(`You bought **${names[input]}** for **${formatCoins(cost)}** coins!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
