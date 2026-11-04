import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

const subreddits = ["memes", "dankmemes", "me_irl", "AdviceAnimals", "funny"];
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;

export const command: HybridCommand = {
  name: "meme",
  aliases: ["dankmeme", "memes"],
  description: "Get a random, non-NSFW meme.",
  usage: "meme",
  examples: ["meme"],
  category: "fun",
  async execute(ctx) {
    try {
      const sub = subreddits[Math.floor(Math.random() * subreddits.length)]!;
      const response = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=50&raw_json=1`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VillainDiscordBot/1.0; +https://github.com/soliqttude/mourn)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Reddit returned HTTP ${response.status}`);
      const payload = await response.json() as {
        data?: { children?: Array<{ data?: { title?: string; url?: string; permalink?: string; ups?: number; num_comments?: number; over_18?: boolean; post_hint?: string; is_video?: boolean; stickied?: boolean } }> }
      };
      const candidates = (payload.data?.children ?? [])
        .map(item => item.data)
        .filter((post): post is NonNullable<typeof post> =>
          !!post && !post.over_18 && !post.is_video && !post.stickied &&
          !!post.title && !!post.url && (IMAGE_EXT.test(post.url) || post.post_hint === "image")
        );
      if (!candidates.length) throw new Error("No image posts returned");
      const post = candidates[Math.floor(Math.random() * candidates.length)]!;
      const embed = brandEmbed({
        title: post.title!.slice(0, 256),
        image: post.url!,
        description: `👍 ${(post.ups ?? 0).toLocaleString()} | 💬 ${(post.num_comments ?? 0).toLocaleString()} | r/${sub}`,
        page: "Meme",
      });
      return ctx.reply({ embeds: [embed] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Couldn't fetch a meme right now. Reddit may be rate-limiting requests; try again shortly.")] });
    }
  },
};
