import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"charcount",description:"Count characters, words, and lines in text.",category:"utility",aliases:["wc","wordcount","chars"],
  options:[{name:"text",description:"Text to analyze",type:ApplicationCommandOptionType.String,required:true}],
  async execute(ctx){
    const text=ctx.getString("text")??ctx.args.join(" ");
    if(!text)return ctx.reply({embeds:[errorEmbed("Provide some text.")]});
    return ctx.reply({embeds:[brandEmbed({title:"📊 Text Stats",fields:[
      {name:"Characters",value:text.length.toString(),inline:true},
      {name:"No Spaces",value:text.replace(/s/g,"").length.toString(),inline:true},
      {name:"Words",value:text.trim().split(/s+/).filter(Boolean).length.toString(),inline:true},
      {name:"Sentences",value:text.split(/[.!?]+/).filter(s=>s.trim().length>0).length.toString(),inline:true},
      {name:"Lines",value:text.split("\n").length.toString(),inline:true},
    ],page:"Utility"})]});
  },
};