import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
const MAP:Record<string,string>={a:"ａ",b:"ｂ",c:"ｃ",d:"ｄ",e:"ｅ",f:"ｆ",g:"ｇ",h:"ｈ",i:"ｉ",j:"ｊ",k:"ｋ",l:"ｌ",m:"ｍ",n:"ｎ",o:"ｏ",p:"ｐ",q:"ｑ",r:"ｒ",s:"ｓ",t:"ｔ",u:"ｕ",v:"ｖ",w:"ｗ",x:"ｘ",y:"ｙ",z:"ｚ"," ":"　"};
export const command: HybridCommand = {
  name:"aesthetic",description:"Convert text to ａｅｓｔｈｅｔｉｃ style.",category:"fun",aliases:["ae","vaportext","fullwidth"],
  options:[{name:"text",description:"Text to convert",type:ApplicationCommandOptionType.String,required:true}],
  async execute(ctx){
    const text=ctx.getString("text")??ctx.args.join(" ");
    if(!text)return ctx.reply({content:"Provide some text."});
    return ctx.reply({embeds:[brandEmbed({title:"ａｅｓｔｈｅｔｉｃ",description:text.toLowerCase().split("").map(c=>MAP[c]??c).join("").slice(0,1900),page:"Fun"})]});
  },
};