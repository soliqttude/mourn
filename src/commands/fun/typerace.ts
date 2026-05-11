import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed } from "../../lib/embeds.js";
const S=["The quick brown fox jumps over the lazy dog","Discord bots make servers so much more fun to use","TypeScript is JavaScript but with types and fewer bugs","The best way to predict the future is to create it yourself","Practice makes perfect but nobody is perfect so why practice"];
export const command: HybridCommand = {
  name:"typerace",description:"Type the sentence as fast as possible to get your WPM!",category:"fun",aliases:["tr","typingrace"],
  async execute(ctx){
    if(!ctx.channel)return;
    const sentence=S[Math.floor(Math.random()*S.length)]!;
    await ctx.reply({embeds:[brandEmbed({title:"⌨️ Typing Race",description:`Type this exactly:\n\n\`\`\`${sentence}\`\`\`\n\n**Go!**`,page:"Fun"})]});
    const start=Date.now();
    const col=ctx.channel.createMessageCollector?.({filter:(m:any)=>m.author.id===ctx.user.id&&m.content.trim()===sentence,time:60000,max:1});
    col?.on("collect",async(m:any)=>{const ms=Date.now()-start;const wpm=Math.round((sentence.split(" ").length/ms)*60000);await m.reply({embeds:[successEmbed(`⏱️ **${(ms/1000).toFixed(2)}s** | **${wpm} WPM**`)]});});
    col?.on("end",(c:any)=>{if(!c.size)ctx.followUp({embeds:[brandEmbed({title:"⌨️ Too slow!",description:`The sentence: \`${sentence}\``,page:"Fun"})]}).catch(()=>{});});
  },
};