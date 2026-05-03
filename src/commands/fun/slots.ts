import type { HybridCommand } from "../../lib/command.js";
import { ApplicationCommandOptionType } from "discord.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";

const symbols = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣", "⭐"];

export const command: HybridCommand = {
  name: "slots",
  description: "Spin the slot machine.",
  category: "economy",
  guildOnly: true,
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet", true) ?? parseInt(ctx.args[0]);
    if (!bet || bet <= 0) return ctx.reply({ embeds: [errorEmbed("Bet must be greater than 0.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    const roll = () => symbols[Math.floor(Math.random() * symbols.length)];
    const s = [roll(), roll(), roll()];
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    let winnings = 0;
    let result = "You lost. 😔";
    if (s[0] === s[1] && s[1] === s[2]) {
      if (s[0] === "💎") { winnings = bet * 10; result = "JACKPOT! 💎 10x"; }
      else if (s[0] === "7️⃣") { winnings = bet * 7; result = "LUCKY SEVENS! 7x"; }
      else { winnings = bet * 3; result = "Three of a kind! 3x"; }
    } else if (s[0] === s[1] || s[1] === s[2] || s[0] === s[2]) {
      winnings = Math.floor(bet * 1.5);
      result = "Two of a kind! 1.5x";
    }
    if (winnings > 0) await addBalance(ctx.guild.id, ctx.user.id, winnings);
    return ctx.reply({
      embeds: [brandEmbed({
        title: "🎰 Slot Machine",
        description: `${s.join(" | ")}\n\n**${result}**\nBet: **${bet}** | ${winnings > 0 ? `Won: **${winnings}**` : "Lost it all."}`,
        page: "Economy",
      })],
    });
  },
};
