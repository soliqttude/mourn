import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "bite",
  aliases: ["chomp", "nibble"],
  description: "Bite someone.",
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to bite", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const gif = await getGif("bite");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} bites ${target.username}! 😬`, image: gif, page: "Fun" })] });
  },
};
