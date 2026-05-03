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
  name: "dance",
  description: "Dance!",
  category: "fun",
  async execute(ctx) {
    const gif = await getGif("dance");
    return ctx.reply({ embeds: [brandEmbed({ title: `${ctx.user.username} is dancing! 💃`, image: gif, page: "Fun" })] });
  },
};
