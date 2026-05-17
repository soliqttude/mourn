import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "slap",
  aliases: ["smack", "whack"],
  description: "Slap someone.",
  usage: "slap [user]",
  examples: ["slap"],
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to slap", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't slap yourself.")] });
    const gif = await getGif("slap");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} slaps ${target.username}! 👋`, image: gif, page: "Fun" })] });
  },
};
