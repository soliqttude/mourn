import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"tempconvert",description:"Convert between Celsius, Fahrenheit, and Kelvin.",category:"utility",aliases:["temp","temperature"],
  options:[
    {name:"value",description:"Temperature value",type:ApplicationCommandOptionType.Number,required:true},
    {name:"unit",description:"c | f | k",type:ApplicationCommandOptionType.String,required:true},
  ],
  async execute(ctx){
    const val=ctx.getNumber("value")??parseFloat(ctx.args[0]??"");
    const unit=(ctx.getString("unit")??ctx.args[1]??"").toLowerCase();
    if(isNaN(val))return ctx.reply({embeds:[errorEmbed("Provide a valid number.")]});
    let c=0,f=0,k=0;
    if(unit==="c"){c=val;f=val*9/5+32;k=val+273.15;}
    else if(unit==="f"){c=(val-32)*5/9;f=val;k=c+273.15;}
    else if(unit==="k"){c=val-273.15;f=c*9/5+32;k=val;}
    else return ctx.reply({embeds:[errorEmbed("Unit: c, f, or k.")]});
    return ctx.reply({embeds:[brandEmbed({title:"🌡️ Temperature Converter",fields:[{name:"Celsius",value:`${c.toFixed(2)} °C`,inline:true},{name:"Fahrenheit",value:`${f.toFixed(2)} °F`,inline:true},{name:"Kelvin",value:`${k.toFixed(2)} K`,inline:true}],page:"Utility"})]});
  },
};