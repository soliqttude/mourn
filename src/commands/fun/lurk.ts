import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";
export const command: HybridCommand = {
  name: "lurk",
  aliases: ["lurking", "watching"], description: "Lurk in the shadows.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "User to lurk at", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? null;
    const gif = await getGif("lurk");
    if (!gif) return ctx.reply({ embeds: [errorEmbed("Could not fetch a GIF.")] });
    const desc = target ? `**${ctx.user.username}** lurks behind **${target.username}** 👀` : `**${ctx.user.username}** is lurking 👀`;
    return ctx.reply({ embeds: [brandEmbed({ description: desc, image: gif, page: "Fun" })] });
  },
};
