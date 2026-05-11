import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name:"imagepurge",description:"Delete messages with images/attachments.",category:"moderation",permission:"mod",guildOnly:true,aliases:["purgeimages"],
  options:[{name:"amount",description:"Messages to scan (max 100)",type:ApplicationCommandOptionType.Number,required:true}],
  async execute(ctx){
    if(!ctx.guild||!ctx.channel||!ctx.member)return;
    if(!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages))return ctx.reply({embeds:[errorEmbed("You need **Manage Messages** permission.")]});
    const amount=Math.min(100,Math.max(1,ctx.getNumber("amount")??parseInt(ctx.args[0]??"20")));
    const msgs=await ctx.channel.messages.fetch({limit:amount});
    const toDelete=msgs.filter(m=>m.attachments.size>0||m.embeds.some(e=>!!e.image));
    if(!toDelete.size)return ctx.reply({embeds:[errorEmbed("No image messages found.")]});
    await(ctx.channel as any).bulkDelete(toDelete,true).catch(()=>{});
    return ctx.reply({embeds:[successEmbed(`🖼️ Deleted **${toDelete.size}** image message(s).`)]});
  },
};