import type { Client } from "discord.js";
import { GuildEmoji } from "discord.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "emojiDelete",
  async execute(client: Client, emoji: GuildEmoji) {
    if (!emoji.guild) return;
    await handleAntinukeAction(client, emoji.guild, "emoji_delete", emoji.id).catch(() => {});
  },
};
