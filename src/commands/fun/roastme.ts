import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
const ROASTS=["You have the charisma of a wet sock in a laundromat.","I would roast you but my mom said I can't burn trash.","Your WiFi password is probably 'password123' and you're proud of it.","You bring everyone so much joy when you leave the voice channel.","If brains were gasoline you couldn't power a toy car around a Cheerio.","You're the human equivalent of a participation trophy.","I've seen better arguments in a terms and conditions agreement.","You're the reason bots have a block command.","Even your Discord status says Idle — fitting, since that's your whole personality.","You type with two fingers and still make typos. Impressive in the worst way.","If you were a Discord role you'd be @everyone — annoying and impossible to turn off."];
export const command: HybridCommand = {
  name:"roastme",description:"Get a savage roast.",category:"fun",aliases:["roast"],
  options:[{name:"target",description:"Who to roast (defaults to you)",type:ApplicationCommandOptionType.User,required:false}],
  async execute(ctx){
    const target=await ctx.getUser("target")??ctx.user;
    return ctx.reply({embeds:[brandEmbed({title:`🔥 Roast — ${target.username}`,description:ROASTS[Math.floor(Math.random()*ROASTS.length)]!,user:target,page:"Fun"})]});
  },
};