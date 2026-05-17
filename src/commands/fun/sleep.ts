import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";
export const command: HybridCommand = {
  name: "sleep",
  aliases: ["zzz", "nap"], description: "Show that you are sleepy.", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "Tag someone", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? null;
    const gif = await getGif("sleep");
    if (!gif) return ctx.reply({ embeds: [errorEmbed("Could not fetch a GIF.")] });
    const desc = target ? `**${ctx.user.username}** falls asleep on **${target.username}** 😴` : `**${ctx.user.username}** is sleeping 😴`;
    return ctx.reply({ embeds: [brandEmbed({ description: desc, image: gif, page: "Fun" })] });
  },
};
