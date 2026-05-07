import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const W = [
  {l:"0.2x 💀",m:0.2,c:0xff1744},{l:"0.5x 🔴",m:0.5,c:0xff5252},{l:"1.5x 🟡",m:1.5,c:0xffd740},
  {l:"2x 🟢",m:2,c:0x00e676},{l:"0.2x 💀",m:0.2,c:0xff1744},{l:"3x 💎",m:3,c:0x00b0ff},
  {l:"1x 🔵",m:1,c:0x448aff},{l:"0.5x 🔴",m:0.5,c:0xff5252},{l:"5x 👑",m:5,c:0xaa00ff},{l:"0.2x 💀",m:0.2,c:0xff1744},
];
export const command: HybridCommand = {
  name: "wheel", description: "Spin the fortune wheel for a random multiplier on your bet.", category: "economy", guildOnly: true,
  aliases: ["spinwheel","fortunewheel"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet||bet<1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance<bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    const idx=Math.floor(Math.random()*W.length), slot=W[idx]!;
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    const payout=Math.floor(bet*slot.m); if(payout>0) await addBalance(ctx.guild.id,ctx.user.id,payout);
    const net=payout-bet;
    const display=W.map((s,i)=>i===idx?`❯ [${s.l}] ◀`:`   ${s.l}`).join("\n");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(slot.c).setTitle("🎡 WHEEL OF FORTUNE")
      .setDescription(["```",display,"```",`**${slot.m}x** — Net: **${net>=0?"+":""}${net}** coins`].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Wheel` }).setTimestamp()] });
  },
};