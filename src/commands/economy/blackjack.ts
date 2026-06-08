import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "blackjack",
  description: "Play blackjack against the dealer.",
  category: "economy",
  aliases: ["bj", "21"],
  guildOnly: true,
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 10) return ctx.reply({ content: "Minimum bet is 10 coins.", ephemeral: true } as any);
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    if (bet > eco.balance) return ctx.reply({ content: "Not enough coins.", ephemeral: true } as any);
    const card = () => { const v = [2,3,4,5,6,7,8,9,10,10,10,10,11]; return v[Math.floor(Math.random()*v.length)]; };
    const hand = [card(), card()];
    const dealer = [card(), card()];
    const sum = (h: number[]) => { let s = h.reduce((a,b)=>a+b,0); while (s > 21 && h.includes(11)) { h[h.indexOf(11)] = 1; s = h.reduce((a,b)=>a+b,0); } return s; };
    const ps = sum([...hand]), ds = sum([...dealer]);
    const playerBust = ps > 21;
    const dealerBust = ds > 21;
    let won = false, push = false;
    if (playerBust) { won = false; }
    else if (dealerBust || ps > ds) { won = true; }
    else if (ps === ds) { push = true; }
    const net = push ? 0 : won ? bet : -bet;
    if (!push) await addBalance(ctx.guild.id, ctx.user.id, net);
    const color = push ? 0xffd700 : won ? 0x00e676 : 0xff4444;
    const outcome = push ? "Push — tie game!" : won ? `You win **${formatCoins(bet)}** coins!` : `Dealer wins. You lost **${formatCoins(bet)}** coins.`;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle("🃏 Blackjack").addFields({ name: `Your Hand (${ps})`, value: hand.join(", "), inline: true },{ name: `Dealer Hand (${ds})`, value: dealer.join(", "), inline: true },{ name: "Result", value: outcome, inline: false }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
