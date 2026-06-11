import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { extractId } from "../../lib/parsing.js";

export const command: HybridCommand = {
  name: "voicemaster",
  aliases: ["vm"],
  description: "Configure the voicemaster system.",
  usage: "voicemaster <hub|joinrole|role|config> [args]",
  examples: [
    "voicemaster hub #Join to Create",
    "voicemaster joinrole @Members",
    "voicemaster role @vcbased",
    "voicemaster config",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "hub | joinrole | role | config", type: ApplicationCommandOptionType.String, required: true,
      choices: [
        { name: "hub", value: "hub" }, { name: "joinrole", value: "joinrole" },
        { name: "role", value: "role" }, { name: "config", value: "config" },
      ] },
    { name: "value", description: "Channel or role", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Voice hub channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Join role or VC role", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const rawVal = ctx.getString("value") ?? ctx.args[1] ?? "";

    if (sub === "config") {
      const s = await getGuildSettings(ctx.guild.id);
      return ctx.reply({ embeds: [brandEmbed({
        title: "Voicemaster",
        fields: [
          { name: "hub", value: s.voicemasterHub ? `<#${s.voicemasterHub}>` : "not set", inline: true },
          { name: "join role", value: (s as any).voicemasterJoinRole ? `<@&${(s as any).voicemasterJoinRole}>` : "not set", inline: true },
          { name: "vc role", value: (s as any).voicemasterVcRole ? `<@&${(s as any).voicemasterVcRole}>` : "not set", inline: true },
        ],
      })] });
    }

    if (sub === "hub") {
      let hub: any = null;
      if (ctx.source === "slash") {
        hub = ctx.getChannel("channel") as any;
      } else {
        const id = extractId(rawVal) ?? rawVal.replace(/^#/, "");
        hub = ctx.guild.channels.cache.get(id) ?? ctx.guild.channels.cache.find(c => c.name.toLowerCase() === id.toLowerCase()) ?? null;
      }
      if (!hub) return ctx.reply({ embeds: [errorEmbed("Please provide a voice **channel**.")] });
      if (hub.type !== ChannelType.GuildVoice) return ctx.reply({ embeds: [errorEmbed("That has to be a **voice channel**.")] });
      await updateGuildSettings(ctx.guild.id, { voicemasterHub: hub.id, voicemasterCategory: hub.parentId ?? null });
      return ctx.reply({ embeds: [successEmbed(`voicemaster hub set to <#${hub.id}>.`)] });
    }

    if (sub === "joinrole") {
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(rawVal.replace(/[<@&>]/g, "")) ??
        ctx.guild.roles.cache.find(r => r.name.toLowerCase() === rawVal.toLowerCase());
      if (!role) return ctx.reply({ embeds: [errorEmbed("Please provide a valid **role**.")] });
      await updateGuildSettings(ctx.guild.id, { voicemasterJoinRole: role.id } as any);
      return ctx.reply({ embeds: [successEmbed(`join role set to <@&${role.id}> — members will receive this role when joining a voicemaster VC.`)] });
    }

    if (sub === "role") {
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(rawVal.replace(/[<@&>]/g, "")) ??
        ctx.guild.roles.cache.find(r => r.name.toLowerCase() === rawVal.toLowerCase());
      if (!role) return ctx.reply({ embeds: [errorEmbed("Please provide a valid **role**.")] });
      await updateGuildSettings(ctx.guild.id, { voicemasterVcRole: role.id } as any);
      return ctx.reply({ embeds: [successEmbed(`VC role set to <@&${role.id}> — members get this while in any voicemaster channel.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand. use: hub | joinrole | **role** | config")] });
  },
};
