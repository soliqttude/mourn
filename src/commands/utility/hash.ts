import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import crypto from "crypto";
export const command: HybridCommand = {
  name:"hash",description:"Hash text with MD5, SHA1, SHA256, or SHA512.",category:"utility",
  options:[
    {name:"algorithm",description:"md5 | sha1 | sha256 | sha512",type:ApplicationCommandOptionType.String,required:true},
    {name:"text",description:"Text to hash",type:ApplicationCommandOptionType.String,required:true},
  ],
  async execute(ctx){
    const algo=(ctx.getString("algorithm")??ctx.args[0]??"").toLowerCase();
    const text=ctx.getString("text")??ctx.args.slice(1).join(" ");
    if(!["md5","sha1","sha256","sha512"].includes(algo))return ctx.reply({embeds:[errorEmbed("Algorithm: md5, sha1, sha256, or sha512.")]});
    const hash=crypto.createHash(algo).update(text).digest("hex");
    return ctx.reply({embeds:[brandEmbed({title:`🔒 ${algo.toUpperCase()} Hash`,description:`**Input:** \`${text.slice(0,200)}\`\n\n**Hash:**\n\`${hash}\``,page:"Utility"})]});
  },
};