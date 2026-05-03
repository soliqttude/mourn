import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

async function getGif(type: string): Promise<string> {
  try {
    const res = await fetch(`https://api.waifu.pics/sfw/${type}`);
    const data = await res.json() as { url: string };
    return data.url;
  } catch { return ""; }
}

export const command: HybridCommand = {
  name: "cuddle",
  description: "Cuddle with someone.",
  category: "fun",
  guildOnly: true,
  options: [{ name: "user", description: "User to cuddle", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't cuddle yourself.")] });
    const gif = await getGif("cuddle");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} cuddles ${target.username}! 🥰`, image: gif, page: "Fun" })] });
  },
};
