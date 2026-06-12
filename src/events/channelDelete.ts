import type { Client, GuildChannel, DMChannel, TextChannel } from "discord.js";
import { EmbedBuilder, ChannelType } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { voicemasterChannels } from "../db/schema.js";

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
  name: "channelDelete",
  async execute(client: Client, channel: GuildChannel | DMChannel) {
    if (!("guild" in channel)) return;
    await handleAntinukeAction(client, channel.guild, "channel_delete", channel.id);
    await db.delete(voicemasterChannels).where(eq(voicemasterChannels.channelId, channel.id)).catch(() => {});

    const settings = await getGuildSettings(channel.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = channel.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    const typeName = CHANNEL_TYPE_NAMES[(channel as GuildChannel).type] ?? "unknown";
    const parent = (channel as any).parent;
    const name = "name" in channel ? channel.name : "unknown";

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: "channel deleted" })
      .addFields(
        { name: "name",     value: `\`${name}\``,                    inline: true },
        { name: "type",     value: typeName,                          inline: true },
        { name: "category", value: parent ? parent.name : "none",    inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `channel id: ${channel.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
