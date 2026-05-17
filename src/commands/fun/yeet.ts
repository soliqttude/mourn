import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";
export const command: HybridCommand = {
  name: "yeet",
  aliases: ["throw", "launch"], description: "Yeet someone into the void.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "User to yeet", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? null;
    const gif = await getGif("yeet");
    if (!gif) return ctx.reply({ embeds: [errorEmbed("Could not fetch a GIF.")] });
    const desc = target ? `**${ctx.user.username}** yeets **${target.username}** into the void 🌀` : `**${ctx.user.username}** yeets themselves 🌀`;
    return ctx.reply({ embeds: [brandEmbed({ description: desc, image: gif, page: "Fun" })] });
  },
};
