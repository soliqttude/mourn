import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, successEmbed, errorEmbed } from "../../lib/embeds.js";
const RIDDLES=[
  {q:"I speak without a mouth and hear without ears. I have no body, but I come alive with the wind.",a:"echo"},
  {q:"The more you take, the more you leave behind.",a:"footsteps"},
  {q:"I have cities but no houses, mountains but no trees, and water but no fish.",a:"map"},
  {q:"I have hands but cannot clap.",a:"clock"},
  {q:"What has to be broken before you can use it?",a:"egg"},
  {q:"The more you have of it, the less you see.",a:"darkness"},
  {q:"I have a head and a tail, but no body.",a:"coin"},
  {q:"What gets wetter as it dries?",a:"towel"},
  {q:"I am not alive but I grow. I have no lungs but I need air.",a:"fire"},
  {q:"I have keys but no locks, space but no room, you can enter but not go inside.",a:"keyboard"},
  {q:"What can run but never walks, has a mouth but never talks?",a:"river"},
];
export const command: HybridCommand = {
  name:"riddle",description:"Get a riddle and try to guess the answer!",category:"fun",aliases:["riddleme"],
  async execute(ctx){
    if(!ctx.channel)return;
    const r=RIDDLES[Math.floor(Math.random()*RIDDLES.length)]!;
    await ctx.reply({embeds:[brandEmbed({title:"🧩 Riddle",description:`${r.q}\n\nType your answer! **45 seconds.**`,page:"Fun"})]});
    const col=ctx.channel.createMessageCollector?.({filter:(m:any)=>m.author.id===ctx.user.id,time:45000,max:5});
    col?.on("collect",async(m:any)=>{if(m.content.toLowerCase().trim()===r.a){col.stop("won");await m.reply({embeds:[successEmbed(`✅ Correct! The answer was **${r.a}**!`)]});}});
    col?.on("end",(_:any,reason:string)=>{if(reason!=="won")ctx.followUp({embeds:[errorEmbed(`⏰ Time's up! The answer was **${r.a}**.`)]}).catch(()=>{});});
  },
};