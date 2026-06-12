import type { Client, GuildChannel, TextChannel } from "discord.js";
import { EmbedBuilder, ChannelType } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

const CHANNEL_TYPE_NAMES: Partial<Record<ChannelType, string>> = {
  [ChannelType.GuildText]:         "text",
  [ChannelType.GuildVoice]:        "voice",
  [ChannelType.GuildCategory]:     "category",
  [ChannelType.GuildAnnouncement]: "announcement",
  [ChannelType.GuildStageVoice]:   "stage",
  [ChannelType.GuildForum]:        "forum",
  [ChannelType.GuildMedia]:        "media",
};

export const event = {
  name: "channelCreate",
  async execute(client: Client, channel: GuildChannel) {
    if (!("guild" in channel) || !channel.guild) return;
    await handleAntinukeAction(client, channel.guild, "channel_create", channel.id);

    const settings = await getGuildSettings(channel.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = channel.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    const typeName = CHANNEL_TYPE_NAMES[channel.type] ?? "unknown";
    const parent = (channel as any).parent;

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setAuthor({ name: "channel created" })
      .addFields(
        { name: "name",     value: `<#${channel.id}> \`${channel.name}\``,         inline: false },
        { name: "type",     value: typeName,                                         inline: true  },
        { name: "category", value: parent ? parent.name : "none",                   inline: true  },
      )
      .setTimestamp()
      .setFooter({ text: `channel id: ${channel.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
