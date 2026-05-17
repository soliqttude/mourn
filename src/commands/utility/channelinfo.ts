import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "channelinfo",
  description: "Get info about a channel.",
  usage: "channelinfo [channel]",
  examples: ["channelinfo"],
  category: "utility",
  guildOnly: true,
  aliases: ["ci"],
  options: [{ name: "channel", description: "Channel", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel("channel") ?? ctx.channel;
    if (!ch) return;
    const full = ctx.guild.channels.cache.get(ch.id);
    if (!full) return;
    const typeNames: Record<number, string> = {
      [ChannelType.GuildText]: "Text", [ChannelType.GuildVoice]: "Voice",
      [ChannelType.GuildCategory]: "Category", [ChannelType.GuildAnnouncement]: "Announcement",
      [ChannelType.GuildStageVoice]: "Stage", [ChannelType.GuildForum]: "Forum",
      [ChannelType.PublicThread]: "Thread",
      [ChannelType.PrivateThread]: "Thread",
      [ChannelType.AnnouncementThread]: "Thread",
    };
    return ctx.reply({
      embeds: [brandEmbed({
        title: `#${full.name}`,
        fields: [
          { name: "ID", value: full.id, inline: true },
          { name: "Type", value: typeNames[full.type] ?? String(full.type), inline: true },
          { name: "Created", value: `<t:${Math.floor(full.createdTimestamp! / 1000)}:R>`, inline: true },
          { name: "Category", value: (full as any).parent?.name ?? "None", inline: true },
          { name: "Position", value: String((full as any).position ?? 0), inline: true },
          { name: "NSFW", value: (full as any).nsfw ? "Yes" : "No", inline: true },
        ],
        page: "Utility",
      })],
    });
  },
};
