import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "trade",
  description: "Propose a coin trade with another user.",
  category: "economy",
  aliases: ["offer"],
  guildOnly: true,
  options: [
    { name: "user", description: "User to trade with", type: ApplicationCommandOptionType.User, required: true }, { name: "amount", description: "Coins you're offering", type: ApplicationCommandOptionType.Integer, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[1] ?? "0");
    if (!target || target.id === ctx.user.id || target.bot) return ctx.reply({ content: "Invalid trade partner.", ephemeral: true } as any);
    if (!amount || amount < 1) return ctx.reply({ content: "Provide a valid trade amount.", ephemeral: true } as any);
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    if (amount > eco.balance) return ctx.reply({ content: "Not enough coins.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("🤝 Trade Offer").setDescription(`**${ctx.user.username}** is offering **${formatCoins(amount)}** coins to **${target.username}**.

Trade system requires both parties to confirm — full interactive trade UI coming soon.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
