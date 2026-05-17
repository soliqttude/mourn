import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "pat",
  aliases: ["headpat", "pets"],
  description: "Pat someone on the head.",
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to pat", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const gif = await getGif("pat");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} pats ${target.username}! 🥺`, image: gif, page: "Fun" })] });
  },
};
