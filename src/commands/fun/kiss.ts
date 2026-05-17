import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "kiss",
  aliases: ["smooch", "smooches"],
  description: "Kiss someone.",
  usage: "kiss [user]",
  examples: ["kiss"],
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to kiss", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't kiss yourself.")] });
    const gif = await getGif("kiss");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} kisses ${target.username}! 💋`, image: gif, page: "Fun" })] });
  },
};
