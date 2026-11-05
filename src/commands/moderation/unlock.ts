import { ApplicationCommandOptionType, ApplicationCommandOptionData, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getGuildSettings } from "../../db/settings.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

const options: ApplicationCommandOptionData[] = [
  { type: ApplicationCommandOptionType.Subcommand, name: "channel", description: "Unlock one channel", options: [{ name: "channel", description: "Channel to unlock", type: ApplicationCommandOptionType.Channel, required: false }, { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false }] },
  { type: ApplicationCommandOptionType.Subcommand, name: "all", description: "Unlock all non-ignored text channels", options: [{ name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false }] }
];

export const command: HybridCommand = {
  name: "unlock",
  aliases: ["unlockchannel", "ulch"],
  description: "Unlock one channel or every non-ignored text channel.",
  category: "moderation",
  permission: "manage_channels",
  guildOnly: true,
  options,
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = ctx.getSubcommand() ?? (ctx.source === "prefix" && ctx.args[0]?.toLowerCase() === "all" ? "all" : "channel");
    const reason = ctx.getString("reason") ?? "Channel unlocked by " + ctx.user.tag;
    const me = ctx.guild.members.me;
    if (!me?.permissions.has("ManageChannels")) return ctx.reply({ embeds: [errorEmbed("I need Manage Channels.")] });
    if (action === "all") {
      const settings = await getGuildSettings(ctx.guild.id);
      const ignored = new Set(settings.lockdownIgnoreChannels ?? []);
      let unlocked = 0, failed = 0;
      await ctx.defer();
      for (const channel of ctx.guild.channels.cache.values()) {
        if (![ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia].includes(channel.type) || !("permissionOverwrites" in channel) || ignored.has(channel.id)) continue;
        try {
          await (channel as any).permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null, AddReactions: null, SendMessagesInThreads: null }, { reason });
          unlocked++;
        } catch { failed++; }
      }
      return ctx.reply({ embeds: [successEmbed("Unlocked " + unlocked + " channels." + (failed ? " Failed: " + failed + "." : "") + (ignored.size ? " Ignored: " + ignored.size + "." : ""))] });
    }
    const channelId = ctx.getChannel("channel")?.id ?? (ctx.source === "prefix" && ctx.args[0]?.toLowerCase() === "channel" ? ctx.args[1]?.replace(/^<#|>$/g, "") : "");
    const channel = (channelId ? ctx.guild.channels.cache.get(channelId) : null) ?? ctx.channel;
    if (!channel || !("permissionOverwrites" in channel)) return ctx.reply({ embeds: [errorEmbed("Cannot unlock this channel type.")] });
    try {
      await (channel as any).permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null, AddReactions: null, SendMessagesInThreads: null }, { reason });
      return ctx.reply({ embeds: [successEmbed("Unlocked <#" + channel.id + ">.")] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not unlock the channel.")] });
    }
  }
};
