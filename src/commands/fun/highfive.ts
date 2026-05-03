import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

async function getGif(type: string): Promise<string> {
  try {
    const res = await fetch(`https://api.waifu.pics/sfw/${type}`);
    const data = await res.json() as { url: string };
    return data.url;
  } catch { return ""; }
}

export const command: HybridCommand = {
  name: "highfive",
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
