import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";
export const command: HybridCommand = {
  name:"unbanall",description:"Unban every banned user in this server.",category:"moderation",permission: "ban_members",guildOnly:true,
  async execute(ctx){
    if(!ctx.guild||!ctx.member)return;
    if(!ctx.member.permissions.has(PermissionFlagsBits.BanMembers))return ctx.reply({embeds:[errorEmbed("You need **Ban Members** **permission**.")]});
    const bans=await ctx.guild.bans.fetch();
    if(!bans.size)return ctx.reply({embeds:[errorEmbed("No banned **users**.")]});
    await ctx.reply({embeds:[new EmbedBuilder().setColor(config.brandColor).setDescription(`⏳ Unbanning **${bans.size}** users...`).setTimestamp()]});
    let done=0,failed=0;
    for(const[id]of bans)await ctx.guild.members.unban(id,`Mass unban by ${ctx.user.tag}`).then(()=>done++).catch(()=>failed++);
    const msg = `Unbanned **${done}** users${failed ? ` (${failed} failed)` : ""}.`;
    return ctx.followUp({embeds:[successEmbed(msg)]});
  },
};