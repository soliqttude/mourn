import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const F = ["","⚀","⚁","⚂","⚃","⚄","⚅"];
export const command: HybridCommand = {
  name: "dicegame", description: "Roll 2 dice vs the house. Higher total wins. Tie = refund.", category: "economy", guildOnly: true,
  aliases: ["dicebet","diceroll"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet || bet < 1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    const d = () => Math.floor(Math.random() * 6) + 1;
    const [p1,p2,h1,h2] = [d(),d(),d(),d()]; const pt=p1+p2,ht=h1+h2;
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    let payout=0,result:"win"|"tie"|"lose";
    if (pt>ht){result="win";payout=bet*2;await addBalance(ctx.guild.id,ctx.user.id,payout);}
    else if (pt===ht){result="tie";payout=bet;await addBalance(ctx.guild.id,ctx.user.id,payout);}
    else result="lose";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(result==="win"?0x00e676:result==="tie"?0xffa726:0xff1744)
      .setTitle(`🎲 DICE — ${result==="win"?"YOU WIN":result==="tie"?"TIE":"HOUSE WINS"}`)
      .setDescription(["```",`  You   :  ${F[p1]} ${F[p2]}  →  ${pt}`,`  House  :  ${F[h1]} ${F[h2]}  →  ${ht}`,"```",
        result==="win"?`💰 Won **+${payout-bet}** coins!`:result==="tie"?"🤝 Tie — bet refunded.":`💸 Lost **${bet}** coins.`].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Dice` }).setTimestamp()] });
  },
};