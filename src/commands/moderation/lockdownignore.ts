import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "lockdownignore",
  description: "Manage channels excluded from server-wide lockdown changes.",
  category: "moderation",
  guildOnly: true,
  permission: "manage_guild",
  options: [
    { type: ApplicationCommandOptionType.Subcommand, name: "add", description: "Exclude a channel", options: [{name:"channel",description:"Channel to exclude",type:ApplicationCommandOptionType.Channel,required:true}] },
    { type: ApplicationCommandOptionType.Subcommand, name: "remove", description: "Remove a channel exclusion", options: [{name:"channel",description:"Channel to include again",type:ApplicationCommandOptionType.Channel,required:true}] },
    { type: ApplicationCommandOptionType.Subcommand, name: "list", description: "List excluded channels" },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getSubcommand() ?? ctx.args[0] ?? "list").toLowerCase();
    const settings = await getGuildSettings(ctx.guild.id);
    const ignored = new Set<string>((settings as any).lockdownIgnoreChannels ?? []);
    if (action === "list") {
      const lines = [...ignored].map(id => `• <#${id}>`);
      return ctx.reply({embeds:[new EmbedBuilder().setColor(0x8b1e2d).setTitle("Lockdown exclusions").setDescription(lines.join("\n") || "No channels are excluded.")]});
    }
    const channel = ctx.getChannel("channel") ?? (ctx.args[1] ? ctx.guild.channels.cache.get(ctx.args[1].replace(/[<#>]/g,"")) : null);
    if (!channel || !("permissionOverwrites" in channel)) return ctx.reply({embeds:[errorEmbed("Provide a valid guild channel.")]});
    if (action === "add") {
      if (ignored.has(channel.id)) return ctx.reply({embeds:[errorEmbed("That channel is already excluded.")]});
      ignored.add(channel.id);
    } else if (action === "remove") {
      if (!ignored.has(channel.id)) return ctx.reply({embeds:[errorEmbed("That channel is not excluded.")]});
      ignored.delete(channel.id);
    } else {
      return ctx.reply({embeds:[errorEmbed("Use add, remove, or list.")]});
    }
    await updateGuildSettings(ctx.guild.id,{lockdownIgnoreChannels:[...ignored]} as any);
    return ctx.reply({embeds:[successEmbed(action === "add" ? `Excluded <#${channel.id}> from server-wide lockdown changes.` : `Removed <#${channel.id}> from lockdown exclusions.`)]});
  },
};
