import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const MULTS = [0.2,0.5,1,1.5,2,3,5,3,2,1.5,1,0.5,0.2];
export const command: HybridCommand = {
  name: "plinko", description: "Drop the ball — watch it bounce through pegs to a multiplier.", category: "economy", guildOnly: true,
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    let pos = 6; const path: string[] = [];
    for (let i = 0; i < 8; i++) { const d = Math.random() < .5 ? -1 : 1; pos = Math.max(0, Math.min(12, pos + d)); path.push(d < 0 ? "↙" : "↘"); }
    const mult = MULTS[pos] ?? 1;
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    const payout = Math.floor(bet * mult);
    if (payout > 0) await addBalance(ctx.guild.id, ctx.user.id, payout);
    const net = payout - bet;
    const slots = MULTS.map((m, i) => i === pos ? `[${m}x]` : `${m}x`).join("  ");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(payout > bet ? 0x00e676 : payout > 0 ? 0xffa726 : 0xff1744).setTitle("🎯 PLINKO")
      .setDescription([`**Path:** ${path.join(" ")}`, "```", slots, `  Landed: slot ${pos} → ${mult}x`, `  Net:    ${net >= 0 ? "+" : ""}${net} coins`, "```"].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Plinko` }).setTimestamp()] });
  },
};