import type { Client, GuildChannel, TextChannel } from "discord.js";
import { EmbedBuilder, ChannelType, AuditLogEvent } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

const CHANNEL_TYPE_NAMES: Partial<Record<ChannelType, string>> = {
  [ChannelType.GuildText]: "Text", [ChannelType.GuildVoice]: "Voice",
  [ChannelType.GuildCategory]: "Category", [ChannelType.GuildAnnouncement]: "Announcement",
  [ChannelType.GuildStageVoice]: "Stage", [ChannelType.GuildForum]: "Forum", [ChannelType.GuildMedia]: "Media",
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

    let executor: string | null = null;
    try {
      const audit = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.targetId === channel.id && (Date.now() - entry.createdTimestamp) < 5000)
        executor = entry.executorId ?? null;
    } catch {}

    const guildIcon = channel.guild.iconURL({ size: 64 }) ?? undefined;
    const typeName  = CHANNEL_TYPE_NAMES[channel.type] ?? "Unknown";
    const parent    = (channel as any).parent;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "Channel Created", iconURL: guildIcon })
      .setDescription(
        `Channel <#${channel.id}> was created${executor ? ` by <@${executor}>` : ""}`
      )
      .addFields(
        { name: "Type",     value: typeName,                       inline: true },
        { name: "Category", value: parent ? parent.name : "none", inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Channel ID: ${channel.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
