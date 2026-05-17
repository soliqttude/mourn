import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";
export const command: HybridCommand = {
  name: "wink",
  aliases: ["winks", "winky"], description: "Wink at someone.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "User to wink at", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? null;
    const gif = await getGif("wink");
    if (!gif) return ctx.reply({ embeds: [errorEmbed("Could not fetch a GIF.")] });
    const desc = target ? `**${ctx.user.username}** winks at **${target.username}** 😉` : `**${ctx.user.username}** winks 😉`;
    return ctx.reply({ embeds: [brandEmbed({ description: desc, image: gif, page: "Fun" })] });
  },
};
