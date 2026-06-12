import type { Client, TextChannel } from "discord.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "webhooksUpdate",
  async execute(client: Client, channel: TextChannel) {
    if (!channel.guild) return;
    await handleAntinukeAction(client, channel.guild, "webhook_create", channel.id).catch(() => {});
  },
};
