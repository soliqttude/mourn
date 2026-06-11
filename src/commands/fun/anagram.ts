import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"anagram",description:"Check if two words are anagrams.",category:"fun",
  options:[
    {name:"word1",description:"First word",type:ApplicationCommandOptionType.String,required:true},
    {name:"word2",description:"Second word",type:ApplicationCommandOptionType.String,required:true},
  ],
  async execute(ctx){
    const w1=(ctx.getString("word1")??ctx.args[0]??"").trim().toLowerCase();
    const w2=(ctx.getString("word2")??ctx.args[1]??"").trim().toLowerCase();
    if(!w1||!w2)return ctx.reply({embeds:[errorEmbed("Provide two **words**.")]});
    const sort=(s:string)=>s.split("").sort().join("");
    return ctx.reply({embeds:[sort(w1)===sort(w2)?successEmbed(`🔤 **${w1}** and **${w2}** ARE anagrams! ✅`):errorEmbed(`**${w1}** and **${w2}** are NOT anagrams.`)]});
  },
};