import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "bonk",
  aliases: ["bap", "boop"],
  description: "Bonk someone. Go to horny jail.",
  usage: "bonk [user]",
  examples: ["bonk"],
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to bonk", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const gif = await getGif("bonk");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} bonks ${target.username}! 🔨 Go to horny jail.`, image: gif, page: "Fun" })] });
  },
};
