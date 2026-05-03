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
  name: "poke",
  description: "Poke someone.",
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
