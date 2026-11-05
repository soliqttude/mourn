import { ApplicationCommandOptionType, ApplicationCommandOptionData, ChannelType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";

const channelOption = { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: true };
const options: ApplicationCommandOptionData[] = [
  { type: ApplicationCommandOptionType.Subcommand, name: "channel", description: "Lock one channel", options: [channelOption, { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false }] },
  { type: ApplicationCommandOptionType.Subcommand, name: "all", description: "Lock every supported text channel", options: [{ name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false }] },
  { type: ApplicationCommandOptionType.Subcommand, name: "role", description: "Restrict a role across text channels", options: [{ name: "role", description: "Role to restrict", type: ApplicationCommandOptionType.Role, required: true }] },
  { type: ApplicationCommandOptionType.SubcommandGroup, name: "ignore", description: "Manage channels excluded from server-wide unlock", options: [
    { type: ApplicationCommandOptionType.Subcommand, name: "add", description: "Add an ignored channel", options: [channelOption] },
    { type: ApplicationCommandOptionType.Subcommand, name: "remove", description: "Remove an ignored channel", options: [channelOption] },
    { type: ApplicationCommandOptionType.Subcommand, name: "list", description: "List ignored channels" }
  ] }
];

function isTextOverwriteChannel(channel: any): boolean {
  return [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia].includes(channel.type) && Boolean(channel.permissionOverwrites);
}

export const command: HybridCommand = {
  name: "lockdown",
  description: "Lock a channel or manage server lockdown settings.",
  aliases: ["lockdownchannel"],
  category: "moderation",
  permission: "manage_channels",
  guildOnly: true,
  options,
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const prefixAction = ctx.source === "prefix" ? (ctx.args[0] ?? "").toLowerCase() : "";
    const prefixNested = ctx.source === "prefix" && prefixAction === "ignore" ? (ctx.args[1] ?? "").toLowerCase() : "";
    const action = ctx.getSubcommand() ?? (prefixAction === "ignore" ? "ignore" : ["all", "role", "channel"].includes(prefixAction) ? prefixAction : "channel");
    const nested = ctx.getSubcommandGroup() ? ctx.getSubcommand() : prefixNested;
    const reason = ctx.getString("reason") ?? (ctx.source === "prefix" ? ctx.args.slice(action === "channel" ? 1 : 2).join(" ").trim() : "") ?? "No reason provided";

    if (action === "ignore") {
      if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild)) return ctx.reply({ embeds: [errorEmbed("Manage Server permission is required to manage lockdown ignores.")] });
      const settings = await getGuildSettings(guild.id);
      const current = [...(settings.lockdownIgnoreChannels ?? [])];
      if (nested === "list") {
        return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Lockdown ignored channels").setDescription(current.length ? current.map(id => "• <#" + id + ">").join("\n") : "No channels are ignored.")] });
      }
      const channelId = ctx.getChannel("channel")?.id ?? (ctx.source === "prefix" ? (ctx.args[2] ?? "").replace(/^<#|>$/g, "") : "");
      const channel = guild.channels.cache.get(channelId);
      if (!channel) return ctx.reply({ embeds: [errorEmbed("Choose a valid channel.")] });
      if (nested === "add") {
        if (current.includes(channel.id)) return ctx.reply({ embeds: [errorEmbed("That channel is already ignored.")] });
        await updateGuildSettings(guild.id, { lockdownIgnoreChannels: [...current, channel.id] });
        return ctx.reply({ embeds: [successEmbed("Added <#" + channel.id + "> to the lockdown ignore list.")] });
      }
      if (nested === "remove") {
        if (!current.includes(channel.id)) return ctx.reply({ embeds: [errorEmbed("That channel is not on the lockdown ignore list.")] });
        await updateGuildSettings(guild.id, { lockdownIgnoreChannels: current.filter(id => id !== channel.id) });
        return ctx.reply({ embeds: [successEmbed("Removed <#" + channel.id + "> from the lockdown ignore list.")] });
      }
      return ctx.reply({ embeds: [errorEmbed("Use lockdown ignore add, remove, or list.")] });
    }

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) return ctx.reply({ embeds: [errorEmbed("I need Manage Channels.")] });
    if (action === "all") {
      const settings = await getGuildSettings(guild.id);
      const ignored = new Set(settings.lockdownIgnoreChannels ?? []);
      let locked = 0, failed = 0;
      await ctx.defer();
      for (const channel of guild.channels.cache.values()) {
        if (!isTextOverwriteChannel(channel) || ignored.has(channel.id)) continue;
        try {
          await (channel as any).permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, AddReactions: false }, { reason: "Lockdown by " + ctx.user.tag + ": " + reason });
          locked++;
        } catch { failed++; }
      }
      return ctx.reply({ embeds: [successEmbed("Locked " + locked + " channels." + (failed ? " Failed: " + failed + "." : "") + (ignored.size ? " Ignored: " + ignored.size + "." : "") + " Reason: " + reason)] });
    }
    if (action === "role") {
      if (!ctx.member?.permissions.has(PermissionFlagsBits.ManageGuild)) return ctx.reply({ embeds: [errorEmbed("Manage Server permission is required for role lockdown.")] });
      const roleId = ctx.getRole("role")?.id ?? (ctx.source === "prefix" ? (ctx.args[1] ?? "").replace(/^<@&|>$/g, "") : "");
      const role = guild.roles.cache.get(roleId);
      if (!role || role.id === guild.id || role.managed) return ctx.reply({ embeds: [errorEmbed("Choose a valid, unmanaged role.")] });
      let updated = 0, failed = 0;
      await ctx.defer();
      for (const channel of guild.channels.cache.values()) {
        if (!isTextOverwriteChannel(channel)) continue;
        try {
          await (channel as any).permissionOverwrites.edit(role, { SendMessages: false, SendMessagesInThreads: false }, { reason: "Role lockdown by " + ctx.user.tag });
          updated++;
        } catch { failed++; }
      }
      return ctx.reply({ embeds: [successEmbed("Restricted <@&" + role.id + "> in " + updated + " channels." + (failed ? " Failed: " + failed + "." : ""))], allowedMentions: { parse: [] } });
    }

    const channel = ctx.getChannel("channel") ?? (ctx.source === "prefix" && prefixAction === "channel" ? guild.channels.cache.get((ctx.args[1] ?? "").replace(/^<#|>$/g, "")) : ctx.channel);
    if (!channel || !("permissionOverwrites" in channel)) return ctx.reply({ embeds: [errorEmbed("Choose a supported channel.")] });
    try {
      await (channel as any).permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: "Locked by " + ctx.user.tag + ": " + reason });
      return ctx.reply({ embeds: [successEmbed("Locked <#" + channel.id + ">. Reason: " + reason)] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not lock the channel.")] });
    }
  }
};
