import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "wave",
  aliases: ["hello", "hi"],
  description: "Wave at someone.",
  usage: "wave [user]",
  examples: ["wave"],
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to wave at", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user");
    const gif = await getGif("wave");
    const title = target ? `${ctx.user.username} waves at ${target.username}! 👋` : `${ctx.user.username} waves! 👋`;
    return ctx.reply({ embeds: [brandEmbed({ title, image: gif, page: "Fun" })] });
  },
};
