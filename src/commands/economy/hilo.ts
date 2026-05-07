import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const V = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const S = ["♠","♥","♦","♣"];
const R: Record<string,number> = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};
const draw = () => ({ v: V[Math.floor(Math.random()*13)]!, s: S[Math.floor(Math.random()*4)]! });
const cs = (c:{v:string;s:string}) => c.v+c.s;
export const command: HybridCommand = {
  name: "hilo", description: "Guess if next card is higher or lower. Keep streaking to multiply!", category: "economy", guildOnly: true,
  aliases: ["highlow","hilow"],
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild||!ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet||bet<1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance<bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    let cur=draw(), mult=1.0, round=1, ended=false;
    const makeEmbed = (state:"playing"|"won"|"lost") => new EmbedBuilder()
      .setColor(state==="won"?0x00e676:state==="lost"?0xff1744:0x0f1923)
      .setTitle(`🃏 HI-LO — Round ${round}`)
      .setDescription(["```",`  Card        :  ${cs(cur)}`,`  Multiplier  :  ${mult.toFixed(2)}x`,`  Potential   :  ${Math.floor(bet*mult)} coins`,"```",
        state==="won"?`💎 Cashed out! Won **${Math.floor(bet*mult)}** coins.`:state==="lost"?"💥 Wrong guess — bet lost!":"Is the next card **Higher** or **Lower**?"].join("\n"))
      .setFooter({ text: `${config.embedFooter} • Hi-Lo` }).setTimestamp();
    const makeRow = (d=false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("hl_hi").setLabel("⬆ Higher").setStyle(ButtonStyle.Primary).setDisabled(d),
      new ButtonBuilder().setCustomId("hl_lo").setLabel("⬇ Lower").setStyle(ButtonStyle.Danger).setDisabled(d),
      new ButtonBuilder().setCustomId("hl_co").setLabel(`💎 Cash Out (${mult.toFixed(2)}x)`).setStyle(ButtonStyle.Success).setDisabled(d),
    );
    if (ctx.source==="slash") await ctx.defer();
    const msg = await ctx.channel.send({ embeds: [makeEmbed("playing")], components: [makeRow() as any] });
    const col = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i=>i.user.id===ctx.user.id, time: 60000 });
    col.on("collect", async i=>{
      if (ended) return i.deferUpdate().catch(()=>{});
      if (i.customId==="hl_co"){ended=true;await addBalance(ctx.guild!.id,ctx.user.id,Math.floor(bet*mult));await i.update({embeds:[makeEmbed("won")],components:[makeRow(true) as any]});return col.stop();}
      const next=draw();
      const ok = i.customId==="hl_hi"?R[next.v]!>R[cur.v]!:R[next.v]!<R[cur.v]!;
      if (!ok){ended=true;await i.update({embeds:[makeEmbed("lost")],components:[makeRow(true) as any]});return col.stop();}
      mult=+(mult*(1.35+Math.random()*0.45)).toFixed(2);cur=next;round++;
      await i.update({embeds:[makeEmbed("playing")],components:[makeRow() as any]});
    });
    col.on("end",async()=>{if(!ended){ended=true;await msg.edit({embeds:[makeEmbed("lost")],components:[]}).catch(()=>{});}});
  },
};