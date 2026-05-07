import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getBalance, removeBalance, addBalance } from "../../features/economy.js";
import { config } from "../../config.js";
const MULTS=[1.5,1.8,2.2,2.8,3.5,4.5,6,8,11,15], ROWS=10;
export const command: HybridCommand = {
  name: "towers", description: "Climb the tower — pick the safe tile. Cash out before you fall!", category: "economy", guildOnly: true,
  options: [{ name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild||!ctx.channel) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    if (!bet||bet<1) return ctx.reply({ embeds: [errorEmbed("Minimum bet is 1 coin.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance<bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    const bombs=Array.from({length:ROWS},()=>Math.floor(Math.random()*3));
    let level=0,mult=1.0,ended=false;
    const cleared:{level:number;safe:number;bomb:number}[]=[];
    const tRow=(d=false)=>new ActionRowBuilder<ButtonBuilder>().addComponents([0,1,2].map(c=>new ButtonBuilder().setCustomId(`tw_${c}`).setLabel("🟦").setStyle(ButtonStyle.Primary).setDisabled(d)));
    const cRow=(d=false)=>new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("tw_co").setLabel(`💎 Cash Out — ${Math.floor(bet*mult)} coins`).setStyle(ButtonStyle.Success).setDisabled(d));
    const makeEmbed=(state:"playing"|"won"|"dead")=>{
      const rows=Array.from({length:ROWS},(_,r)=>{
        const ri=ROWS-1-r,cl=cleared.find(c=>c.level===ri);
        if(cl)return[0,1,2].map(c=>c===cl.safe?"✅":c===cl.bomb?"💣":"✅").join(" ")+(ri===level-1?" ←":"");
        if(ri===level&&state==="playing")return"🟦 🟦 🟦  ← pick";return"▪  ▪  ▪";
      });
      return new EmbedBuilder().setColor(state==="won"?0x00e676:state==="dead"?0xff1744:0x0f1923)
        .setTitle(`🗼 TOWERS — Level ${level}/${ROWS} | ${mult.toFixed(2)}x`)
        .setDescription(["```",...rows,"```",state==="won"?`💎 Cashed out! Won **${Math.floor(bet*mult)}** coins.`:state==="dead"?"💥 Hit a bomb! Bet lost.":""].join("\n"))
        .setFooter({text:`${config.embedFooter} • Towers`}).setTimestamp();
    };
    if(ctx.source==="slash") await ctx.defer();
    const msg=await ctx.channel.send({embeds:[makeEmbed("playing")],components:[tRow() as any,cRow() as any]});
    const col=msg.createMessageComponentCollector({componentType:ComponentType.Button,filter:i=>i.user.id===ctx.user.id,time:120000});
    col.on("collect",async i=>{
      if(ended)return i.deferUpdate().catch(()=>{});
      if(i.customId==="tw_co"){ended=true;await addBalance(ctx.guild!.id,ctx.user.id,Math.floor(bet*mult));await i.update({embeds:[makeEmbed("won")],components:[]});return col.stop();}
      const c=parseInt(i.customId.replace("tw_",""));const bomb=bombs[level]!;
      cleared.push({level,safe:c,bomb});
      if(c===bomb){ended=true;await i.update({embeds:[makeEmbed("dead")],components:[]});return col.stop();}
      mult=+(mult*MULTS[level]!).toFixed(2);level++;
      if(level>=ROWS){ended=true;await addBalance(ctx.guild!.id,ctx.user.id,Math.floor(bet*mult));await i.update({embeds:[makeEmbed("won")],components:[]});return col.stop();}
      await i.update({embeds:[makeEmbed("playing")],components:[tRow() as any,cRow() as any]});
    });
    col.on("end",async()=>{if(!ended){ended=true;await msg.edit({embeds:[makeEmbed("dead")],components:[]}).catch(()=>{});}});
  },
};