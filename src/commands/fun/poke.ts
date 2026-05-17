import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "poke",
  aliases: ["prod", "jab"],
  description: "Poke someone.",
  usage: "poke [user]",
  examples: ["poke"],
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to poke", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const gif = await getGif("poke");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} pokes ${target.username}! 👉`, image: gif, page: "Fun" })] });
  },
};
