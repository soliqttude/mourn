import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"numberguess",description:"Guess a number 1-100 in 5 tries.",category:"fun",aliases:["numguess","guessnumber"],
  async execute(ctx){
    if(!ctx.channel)return;
    const secret=Math.floor(Math.random()*100)+1;let tries=5;
    await ctx.reply({embeds:[brandEmbed({title:"🔢 Number Guess",description:"I'm thinking of a number **1-100**.\nType your guess! **5 tries.**",page:"Fun"})]});
    const col=ctx.channel.createMessageCollector?.({filter:(m:any)=>m.author.id===ctx.user.id&&!isNaN(parseInt(m.content)),time:60000});
    col?.on("collect",async(m:any)=>{
      const g=parseInt(m.content);tries--;
      if(g===secret){col.stop();return m.reply({embeds:[successEmbed(`🎉 Correct! It was **${secret}**.`)]});}
      if(tries===0){col.stop();return m.reply({embeds:[errorEmbed(`Out of tries! It was **${secret}**.`)]});}
      await m.reply({embeds:[brandEmbed({title:g<secret?"📈 Too Low!":"📉 Too High!",description:`**${tries}** tries left.`,page:"Fun"})]});
    });
    col?.on("end",(_:any,r:string)=>{if(r==="time")ctx.followUp({embeds:[errorEmbed(`⏰ Time's up! It was **${secret}**.`)]}).catch(()=>{});});
  },
};