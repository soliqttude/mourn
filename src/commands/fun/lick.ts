import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "lick",
  aliases: ["tongue", "lickme"],
  description: "Lick someone.",
  usage: "lick [user]",
  examples: ["lick"],
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to lick", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const gif = await getGif("lick");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} licks ${target.username}! 👅`, image: gif, page: "Fun" })] });
  },
};
