import type { Client, GuildChannel, DMChannel, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { voicemasterChannels } from "../db/schema.js";

export const event = {
  name: "channelDelete",
  async execute(client: Client, channel: GuildChannel | DMChannel) {
    if (!("guild" in channel)) return;
    await handleAntinukeAction(client, channel.guild, "channel_delete", channel.id);
    await db
      .delete(voicemasterChannels)
      .where(eq(voicemasterChannels.channelId, channel.id))
      .catch(() => {});

    const settings = await getGuildSettings(channel.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = channel.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    await (logCh as TextChannel).send({
      embeds: [
        brandEmbed({
          authorName: "channel deleted",
          description: `**Name:** ${"name" in channel ? channel.name : "unknown"}\n**ID:** \`${channel.id}\``,
          page: "Logs",
        }).setTimestamp(),
      ],
    }).catch(() => {});
  },
};
