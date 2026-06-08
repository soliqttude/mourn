import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "slots",
  description: "Spin the slot machine.",
  category: "economy",
  aliases: ["slot", "spin"],
  guildOnly: true,
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 10) return ctx.reply({ content: "Minimum bet is 10 coins.", ephemeral: true } as any);
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    if (bet > eco.balance) return ctx.reply({ content: "You don't have enough coins.", ephemeral: true } as any);
    const emojis = ["🍒","🍋","🍊","🍇","⭐","💎"];
    const [a, b, c] = Array.from({length:3}, () => emojis[Math.floor(Math.random()*emojis.length)]);
    const board = `| ${a} | ${b} | ${c} |`;
    let winnings = 0;
    if (a === b && b === c) { winnings = a === "💎" ? bet * 10 : bet * 5; }
    else if (a === b || b === c || a === c) { winnings = Math.floor(bet * 1.5); }
    const net = winnings - bet;
    await addBalance(ctx.guild.id, ctx.user.id, net);
    const color = net >= 0 ? 0x00e676 : 0xff4444;
    const result = net > 0 ? `🎉 You won **${formatCoins(winnings)}** coins! (+${formatCoins(net)})` : `😢 You lost **${formatCoins(bet)}** coins.`;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle("🎰 Slot Machine").addFields({ name: "Board", value: board, inline: false },{ name: "Result", value: result, inline: false }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
