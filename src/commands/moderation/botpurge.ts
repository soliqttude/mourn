import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"botpurge",description:"Delete messages sent by bots.",category:"moderation",permission:"mod",guildOnly:true,aliases:["purgebots"],
  options:[{name:"amount",description:"Messages to scan (max 100)",type:ApplicationCommandOptionType.Number,required:true}],
  async execute(ctx){
    if(!ctx.guild||!ctx.channel||!ctx.member)return;
    if(!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages))return ctx.reply({embeds:[errorEmbed("You need **Manage Messages** permission.")]});
    const amount=Math.min(100,Math.max(1,ctx.getNumber("amount")??parseInt(ctx.args[0]??"20")));
    const msgs=await ctx.channel.messages.fetch({limit:amount});
    const toDelete=msgs.filter(m=>m.author.bot);
    if(!toDelete.size)return ctx.reply({embeds:[errorEmbed("No bot messages found.")]});
    await(ctx.channel as any).bulkDelete(toDelete,true).catch(()=>{});
    return ctx.reply({embeds:[successEmbed(`Deleted **${toDelete.size}** bot message(s).`,"🤖 Bot Purge")]});
  },
};