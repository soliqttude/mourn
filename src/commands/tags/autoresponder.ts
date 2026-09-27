import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed } from "../../lib/embeds.js";
import {
  addAutoresponder, listAutoresponders, removeAutoresponderByTrigger,
  resetAutoresponders, updateAutoresponder, updateAutoresponderExclusive,
  updateAutoresponderRoles,
} from "../../features/autoresponders.js";

type ArOptions = {
  notStrict: boolean; selfDestructSeconds: number | null; deleteTrigger: boolean;
  reply: boolean; ignoreCommandCheck: boolean;
};

function parseInput(args: string[]) {
  const o: ArOptions = { notStrict:false, selfDestructSeconds:null, deleteTrigger:false, reply:false, ignoreCommandCheck:false };
  const kept: string[] = [];
  for (let i=0;i<args.length;i++) {
    const a=args[i]!;
    if (a==="--not_strict") o.notStrict=true;
    else if (a==="--delete") o.deleteTrigger=true;
    else if (a==="--reply") o.reply=true;
    else if (a==="--ignore_command_check") o.ignoreCommandCheck=true;
    else if (a==="--self_destruct") {
      const n=args[i+1];
      if (n && /^\\d+$/.test(n)) { o.selfDestructSeconds=Number(n); i++; }
      else o.selfDestructSeconds=6;
    } else kept.push(a);
  }
  const joined=kept.join(" ");
  const comma=joined.indexOf(",");
  return {
    trigger:(comma>=0?joined.slice(0,comma):kept[0]??"").trim(),
    response:(comma>=0?joined.slice(comma+1):kept.slice(1).join(" ")).trim(),
    options:o
  };
}

export const command: HybridCommand = {
  name:"autoresponder", aliases:["ar"],
  description:"Set up automatic replies to messages matching a trigger.",
  usage:"autoresponder <add|remove|update|exclusive|role|reset|list> [args]",
  examples:[
    "autoresponder add hello, hi there!",
    "autoresponder add hello, hi there! --not_strict --reply",
    "autoresponder update hello, updated response",
    "autoresponder remove hello",
    "autoresponder reset", "autoresponder list",
    "autoresponder exclusive channel #general hello",
    "autoresponder role add @Member hello",
  ],
  category:"tags", permission:"manage_guild", guildOnly:true,
  options:[
    {name:"action",description:"add|remove|update|list|reset|exclusive|role",type:ApplicationCommandOptionType.String,required:true},
    {name:"trigger",description:"Trigger",type:ApplicationCommandOptionType.String,required:false},
    {name:"response",description:"Response",type:ApplicationCommandOptionType.String,required:false},
    {name:"value",description:"Channel, role, or subaction",type:ApplicationCommandOptionType.String,required:false},
    {name:"channel",description:"Exclusive channel",type:ApplicationCommandOptionType.Channel,required:false},
    {name:"role",description:"Role",type:ApplicationCommandOptionType.Role,required:false},
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action=(ctx.getString("action")??ctx.args[0]??"").toLowerCase();

    if(action==="list"){
      const list=await listAutoresponders(ctx.guild.id);
      if(!list.length) return ctx.reply({embeds:[errorEmbed("No autoresponders.")]});
      return ctx.reply({embeds:[brandEmbed({title:"autoresponders",description:list.map(a=>{
        const flags=[a.notStrict?"--not_strict":"",a.selfDestructSeconds?"--self_destruct "+a.selfDestructSeconds:"",a.deleteTrigger?"--delete":"",a.reply?"--reply":"",a.ignoreCommandCheck?"--ignore_command_check":""].filter(Boolean).join(" ");
        return "**"+a.trigger+"** → "+a.response.slice(0,80)+(flags?"\n"+flags:"");
      }).join("\n")})]});
    }

    if(action==="reset"){
      await resetAutoresponders(ctx.guild.id);
      return ctx.reply({embeds:[successEmbed("all autoresponders have been reset.","tags")]});
    }

    if(action==="add"||action==="update"){
      const input=parseInput(ctx.args.slice(1));
      if(input.options.selfDestructSeconds!==null&&(input.options.selfDestructSeconds<6||input.options.selfDestructSeconds>60))
        return ctx.reply({embeds:[errorEmbed("The --self_destruct time must be between 6 and 60 seconds.")]});
      if(!input.trigger) return ctx.reply({embeds:[errorEmbed("Provide a trigger.")]});
      if(!input.response) return ctx.reply({embeds:[errorEmbed("Provide a response after the comma.")]});
      if(action==="add"){
        await addAutoresponder(ctx.guild.id,input.trigger,input.response,"contains",ctx.user.id,input.options);
        return ctx.reply({embeds:[successEmbed("autoresponder added for **"+input.trigger+"**.","tags")]});
      }
      const updated=await updateAutoresponder(ctx.guild.id,input.trigger,input.response,input.options);
      if(!updated) return ctx.reply({embeds:[errorEmbed("No autoresponder exists for **"+input.trigger+"**.")]});
      return ctx.reply({embeds:[successEmbed("autoresponder **"+input.trigger+"** updated.","tags")]});
    }

    if(action==="remove"){
      const trigger=(ctx.getString("trigger")??ctx.args.slice(1).join(" ")).trim();
      if(!trigger) return ctx.reply({embeds:[errorEmbed("Provide a trigger.")]});
      const removed=await removeAutoresponderByTrigger(ctx.guild.id,trigger);
      if(!removed) return ctx.reply({embeds:[errorEmbed("No autoresponder exists for **"+trigger+"**.")]});
      return ctx.reply({embeds:[successEmbed("removed autoresponder **"+trigger+"**.","tags")]});
    }

    if(action==="exclusive"){
      const mode=(ctx.args[1]??"").toLowerCase();
      if(mode!=="channel"&&mode!=="role") return ctx.reply({embeds:[errorEmbed("Use exclusive channel <channel> <trigger> or exclusive role <role> <trigger>.")]});
      const rows=await listAutoresponders(ctx.guild.id);
      const value=ctx.args[2]??"";
      const trigger=ctx.args.slice(3).join(" ").trim();
      const target=rows.find(a=>a.trigger===trigger.toLowerCase());
      if(!target) return ctx.reply({embeds:[errorEmbed("No autoresponder exists for **"+trigger+"**.")]});
      if(mode==="channel"){
        const ch=ctx.getChannel("channel")??ctx.guild.channels.cache.get(value.replace(/[<#>]/g,""));
        if(!ch) return ctx.reply({embeds:[errorEmbed("Provide a channel.")]});
        await updateAutoresponderExclusive(target.id,ch.id,null);
        return ctx.reply({embeds:[successEmbed("autoresponder **"+trigger+"** is exclusive to <#"+ch.id+">.","tags")]});
      }
      const role=ctx.getRole("role")??ctx.guild.roles.cache.get(value.replace(/[<@&>]/g,""));
      if(!role) return ctx.reply({embeds:[errorEmbed("Provide a role.")]});
      await updateAutoresponderExclusive(target.id,null,role.id);
      return ctx.reply({embeds:[successEmbed("autoresponder **"+trigger+"** is exclusive to <@&"+role.id+">.","tags")]});
    }

    if(action==="role"){
      const mode=(ctx.args[1]??"").toLowerCase();
      if(mode!=="add"&&mode!=="remove") return ctx.reply({embeds:[errorEmbed("Use role add <role> <trigger> or role remove <role> <trigger>.")]});
      const roleId=(ctx.args[2]??"").replace(/[<@&>]/g,"");
      const trigger=ctx.args.slice(3).join(" ").trim();
      const role=ctx.getRole("role")??ctx.guild.roles.cache.get(roleId);
      if(!role||!trigger) return ctx.reply({embeds:[errorEmbed("Provide a role and trigger.")]});
      const target=(await listAutoresponders(ctx.guild.id)).find(a=>a.trigger===trigger.toLowerCase());
      if(!target) return ctx.reply({embeds:[errorEmbed("No autoresponder exists for **"+trigger+"**.")]});
      if(mode==="add") await updateAutoresponderRoles(target.id,role.id,null);
      else await updateAutoresponderRoles(target.id,null,role.id);
      return ctx.reply({embeds:[successEmbed("autoresponder role "+mode+" configured for **"+trigger+"**.","tags")]});
    }

    return ctx.reply({embeds:[errorEmbed("Invalid autoresponder subcommand.")]});
  },
};
