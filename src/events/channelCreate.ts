import type { Client, GuildChannel, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

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

    await (logCh as TextChannel).send({
      embeds: [
        brandEmbed({
          authorName: "channel created",
          description: `**Name:** ${channel.name}\n**Type:** ${channel.type}\n**ID:** \`${channel.id}\``,
          page: "Logs",
        }).setTimestamp(),
      ],
    }).catch(() => {});
  },
};
