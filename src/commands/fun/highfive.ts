import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getGif } from "../../lib/gif.js";

export const command: HybridCommand = {
  name: "highfive",
  aliases: ["hi5", "hive"],
  description: "High five someone!",
  category: "fun",
  options: [{ name: "user", description: "User to high five", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const gif = await getGif("highfive");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} high-fives ${target.username}! 🙌`, image: gif, page: "Fun" })] });
  },
};
