import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"binary",description:"Convert text to binary or binary back to text.",category:"utility",
  options:[
    {name:"mode",description:"encode | decode",type:ApplicationCommandOptionType.String,required:true},
    {name:"input",description:"Text or binary string",type:ApplicationCommandOptionType.String,required:true},
  ],
  async execute(ctx){
    const mode=(ctx.getString("mode")??ctx.args[0]??"").toLowerCase();
    const input=ctx.getString("input")??ctx.args.slice(1).join(" ");
    if(!["encode","decode"].includes(mode))return ctx.reply({embeds:[errorEmbed("Mode: encode or decode.")]});
    const result=mode==="encode"?input.split("").map(c=>c.charCodeAt(0).toString(2).padStart(8,"0")).join(" "):input.split(" ").map(b=>String.fromCharCode(parseInt(b,2))).join("");
    return ctx.reply({embeds:[brandEmbed({title:`💻 Binary — ${mode}`,description:`**Input:** \`${input.slice(0,200)}\`\n\n**Output:**\n\`${result.slice(0,1500)}\``,page:"Utility"})]});
  },
};