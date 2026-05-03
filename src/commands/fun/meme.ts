import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

const subreddits = ["memes", "dankmemes", "me_irl", "AdviceAnimals", "funny"];

export const command: HybridCommand = {
  name: "meme",
  description: "Get a random meme.",
  category: "fun",
  async execute(ctx) {
    try {
      const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
      const res = await fetch(`https://www.reddit.com/r/${sub}/random.json?limit=1`, {
        headers: { "User-Agent": "mourn-bot/1.0" },
      });
      const data = await res.json() as any;
      const post = data?.[0]?.data?.children?.[0]?.data;
      if (!post || post.over_18) return ctx.reply({ embeds: [errorEmbed("Couldn't fetch a meme right now.")] });
      return ctx.reply({
        embeds: [brandEmbed({
          title: post.title?.slice(0, 256) ?? "meme",
          image: post.url,
          description: `👍 ${post.ups?.toLocaleString()} | 💬 ${post.num_comments?.toLocaleString()} | r/${sub}`,
          page: "Meme",
        })],
      });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Couldn't fetch a meme right now.")] });
    }
  },
};
