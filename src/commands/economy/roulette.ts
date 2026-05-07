import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const command: HybridCommand = {
  name: "roulette", description: "Spin the roulette wheel. Bet red/black/green or a number 0-36.", category: "economy", guildOnly: true, aliases: ["rl"],
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "choice", description: "red | black | green | 0-36", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    const choice = (ctx.getString("choice") ?? ctx.args[1] ?? "").toLowerCase().trim();
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    const num = Math.floor(Math.random() * 37);
    const isRed = REDS.has(num), isGreen = num === 0;
    const cname = isGreen ? "green" : isRed ? "red" : "black";
    const emoji = isGreen ? "🟢" : isRed ? "🔴" : "⚫";
    const nb = parseInt(choice);
    let mult = 0;
    if (!isNaN(nb) && nb >= 0 && nb <= 36) { if (nb === num) mult = 36; }
    else if (choice === "red" && isRed) mult = 2;
    else if (choice === "black" && !isRed && !isGreen) mult = 2;
    else if (choice === "green" && isGreen) mult = 14;
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    const payout = Math.floor(bet * mult);
    if (payout > 0) await addBalance(ctx.guild.id, ctx.user.id, payout);
    const net = payout - bet;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(payout > 0 ? 0x00e676 : 0xff1744)
      .setTitle(`🎡 ROULETTE — ${payout > 0 ? "WIN" : "LOSS"}`)
      .setDescription(["```",
        `  Result    :  ${emoji} ${num} (${cname})`,
        `  Your Bet  :  ${choice.toUpperCase()} — ${bet} coins`,
        `  Payout    :  ${mult}x`,
        `  Net       :  ${net >= 0 ? "+" : ""}${net} coins`,
        "```"].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Roulette` }).setTimestamp()] });
  },
};