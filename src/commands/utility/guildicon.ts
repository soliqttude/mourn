import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"guildicon",description:"Get the server icon.",category:"utility",guildOnly:true,aliases:["servericon","sicon"],
  async execute(ctx){
    if(!ctx.guild)return ctx.reply({embeds:[errorEmbed("Must be used in a server.")]});
    const url=ctx.guild.iconURL({size:4096,extension:"png"});
    if(!url)return ctx.reply({embeds:[errorEmbed("This server has no icon.")]});
    return ctx.reply({embeds:[brandEmbed({title:`🖼️ ${ctx.guild.name} — Icon`,image:url,page:"Utility"})]});
  },
};