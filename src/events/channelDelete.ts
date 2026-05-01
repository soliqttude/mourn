import type { Client, GuildChannel, DMChannel } from "discord.js";
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
  },
};
