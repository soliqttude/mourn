import type { Client, GuildChannel } from "discord.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "channelCreate",
  async execute(client: Client, channel: GuildChannel) {
    if (!("guild" in channel) || !channel.guild) return;
    await handleAntinukeAction(client, channel.guild, "channel_create", channel.id);
  },
};
