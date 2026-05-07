import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"base64",description:"Encode or decode Base64.",category:"utility",aliases:["b64"],
  options:[
    {name:"mode",description:"encode | decode",type:ApplicationCommandOptionType.String,required:true},
    {name:"text",description:"Text to process",type:ApplicationCommandOptionType.String,required:true},
  ],
  async execute(ctx){
    const mode=(ctx.getString("mode")??ctx.args[0]??"").toLowerCase();
    const text=ctx.getString("text")??ctx.args.slice(1).join(" ");
    if(!["encode","decode"].includes(mode))return ctx.reply({embeds:[errorEmbed("Mode: encode or decode.")]});
    let result:string;
    try{result=mode==="encode"?Buffer.from(text).toString("base64"):Buffer.from(text,"base64").toString("utf8");}
    catch{return ctx.reply({embeds:[errorEmbed("Failed to process.")]});}
    return ctx.reply({embeds:[brandEmbed({title:`🔐 Base64 — ${mode}`,description:`**Input:** \`${text.slice(0,300)}\`\n\n**Output:**\n\`${result.slice(0,1500)}\``,page:"Utility"})]});
  },
};