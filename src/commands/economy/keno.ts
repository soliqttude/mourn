import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const PAYOUT = [0,0,1,2,4,8,15,30,60,100,200];
export const command: HybridCommand = {
  name: "keno", description: "Pick 1-10 numbers (1-40). Match draws to win.", category: "economy", guildOnly: true,
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "numbers", description: "Your picks space-separated e.g. 5 12 23", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    const raw = ctx.getString("numbers") ?? ctx.args.slice(1).join(" ");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });
    const picks = [...new Set(raw.split(/\s+/).map(Number).filter(n => n >= 1 && n <= 40))];
    if (picks.length < 1 || picks.length > 10) return ctx.reply({ embeds: [errorEmbed("Pick 1-10 unique numbers between 1 and 40.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    const drawn = new Set<number>(); while (drawn.size < 20) drawn.add(Math.floor(Math.random() * 40) + 1);
    const hits = picks.filter(p => drawn.has(p));
    const mult = PAYOUT[hits.length] ?? 0;
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    const payout = Math.floor(bet * mult);
    if (payout > 0) await addBalance(ctx.guild.id, ctx.user.id, payout);
    const net = payout - bet;
    const dp = picks.map(p => drawn.has(p) ? `**${p}**✅` : `${p}`).join(" ");
    const dd = [...drawn].sort((a,b) => a-b).map(n => picks.includes(n) ? `**${n}**` : `${n}`).join(" ");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(hits.length >= 3 ? 0x00e676 : hits.length > 0 ? 0xffa726 : 0xff1744)
      .setTitle(`🎱 KENO — ${hits.length}/${picks.length} Matches`)
      .setDescription([`**Your picks:** ${dp}`, `**Drawn:** ${dd}`, "```",
        `  Matches    :  ${hits.length}`, `  Multiplier :  ${mult}x`, `  Net        :  ${net >= 0 ? "+" : ""}${net} coins`, "```"].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Keno` }).setTimestamp()] });
  },
};