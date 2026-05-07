import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"age",description:"Calculate age from a birthday.",category:"utility",aliases:["birthday","calcage"],
  options:[{name:"date",description:"Birthday in MM/DD/YYYY format",type:ApplicationCommandOptionType.String,required:true}],
  async execute(ctx){
    const d=new Date(ctx.getString("date")??ctx.args[0]??"");
    if(isNaN(d.getTime()))return ctx.reply({embeds:[errorEmbed("Invalid date. Use MM/DD/YYYY.")]});
    const now=new Date();
    let y=now.getFullYear()-d.getFullYear(),mo=now.getMonth()-d.getMonth(),da=now.getDate()-d.getDate();
    if(da<0){mo--;da+=30;}if(mo<0){y--;mo+=12;}
    const next=new Date(d);next.setFullYear(now.getFullYear());if(next<now)next.setFullYear(now.getFullYear()+1);
    const dl=Math.ceil((next.getTime()-now.getTime())/86400000);
    return ctx.reply({embeds:[brandEmbed({title:"🎂 Age Calculator",description:[`**Age:** ${y}y ${mo}m ${da}d`,`**Birthday:** ${d.toDateString()}`,`**Next birthday in:** ${dl} days`].join("\n"),page:"Utility"})]});
  },
};