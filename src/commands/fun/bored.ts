import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";
export const command: HybridCommand = {
  name: "bored",
  aliases: ["boredaf", "activities"], description: "Express boredom.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "Blame someone for your boredom", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? null;
    const gif = await getGif("bored");
    if (!gif) return ctx.reply({ embeds: [errorEmbed("Could not fetch a GIF.")] });
    const desc = target ? `**${ctx.user.username}** is bored because of **${target.username}** 😐` : `**${ctx.user.username}** is so bored right now 😐`;
    return ctx.reply({ embeds: [brandEmbed({ description: desc, image: gif, page: "Fun" })] });
  },
};
