import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";
const WORDS=["discord","gaming","javascript","typescript","channel","moderation","economy","leaderboard","gambling","multiplier","adventure","legendary","champion","inventory","moderator","developer","community","reaction"];
function shuffle(w:string){const a=w.split("");for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j]!,a[i]!];}return a.join("");}
export const command: HybridCommand = {
  name:"scramble",description:"Unscramble the word before time runs out!",category:"fun",
  async execute(ctx){
    if(!ctx.channel)return;
    const word=WORDS[Math.floor(Math.random()*WORDS.length)]!;
    let sc=shuffle(word);while(sc===word)sc=shuffle(word);
    await ctx.reply({embeds:[brandEmbed({title:"🔀 Word Scramble",description:`Unscramble this:\n\n# \`${sc}\`\n\nType your answer! **30 seconds.**`,page:"Fun"})]});
    const col=ctx.channel.createMessageCollector?.({filter:(m:any)=>m.author.id===ctx.user.id&&m.content.toLowerCase().trim()===word,time:30000,max:1});
    col?.on("collect",async(m:any)=>m.reply({embeds:[successEmbed(`✅ Correct! The word was **${word}**.`)]}));
    col?.on("end",(c:any)=>{if(!c.size)ctx.followUp({embeds:[errorEmbed(`⏰ Time's up! The word was **${word}**.`)]}).catch(()=>{});});
  },
};