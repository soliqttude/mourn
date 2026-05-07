import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";
export const command: HybridCommand = {
  name:"hex",description:"Convert between HEX and RGB colors.",category:"utility",aliases:["rgb","colorconvert","colorinfo"],
  options:[{name:"value",description:"#hex or R G B",type:ApplicationCommandOptionType.String,required:true}],
  async execute(ctx){
    const raw=ctx.getString("value")??ctx.args.join(" ");
    let r=0,g=0,b=0,hex="";
    const hm=raw.match(/^#?([0-9a-f]{6})$/i),rm=raw.match(/(d+)s+(d+)s+(d+)/);
    if(hm){hex=hm[1]!;r=parseInt(hex.slice(0,2),16);g=parseInt(hex.slice(2,4),16);b=parseInt(hex.slice(4,6),16);}
    else if(rm){r=parseInt(rm[1]!);g=parseInt(rm[2]!);b=parseInt(rm[3]!);if([r,g,b].some(v=>v>255))return ctx.reply({embeds:[errorEmbed("RGB values must be 0-255.")]});hex=[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");}
    else return ctx.reply({embeds:[errorEmbed("Format: #rrggbb or R G B.")]});
    const dec=parseInt(hex,16);
    return ctx.reply({embeds:[new EmbedBuilder().setColor(dec as any).setTitle("🎨 Color Info")
      .addFields({name:"HEX",value:`#${hex.toUpperCase()}`,inline:true},{name:"RGB",value:`rgb(${r},${g},${b})`,inline:true},{name:"Decimal",value:dec.toString(),inline:true})
      .setFooter({text:config.embedFooter}).setTimestamp()]});
  },
};