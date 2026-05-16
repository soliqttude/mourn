import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "wikipedia", aliases: ["wiki"], description: "Search Wikipedia for a topic.", category: "utility",
  options: [{ name: "query", description: "Search query", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const query = ctx.getString("query", true) ?? ctx.args.join(" ");
    if (!query) return ctx.reply({ embeds: [errorEmbed("Please provide a search query.")] });
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, "_"))}`, { headers: { "User-Agent": "bleed-bot/1.0" } });
      if (res.status === 404) return ctx.reply({ embeds: [errorEmbed(`No Wikipedia article found for **${query}**.`)] });
      const data = await res.json() as any;
      if (data.type === "disambiguation") return ctx.reply({ embeds: [errorEmbed(`**${query}** is ambiguous. Try a more specific term.`)] });
      const extract = (data.extract ?? "No description.").slice(0, 1000);
      const link = data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`;
      return ctx.reply({ embeds: [brandEmbed({ title: `📖 ${data.title}`, description: `${extract}${(data.extract?.length ?? 0) > 1000 ? "..." : ""}\n\n[Read more on Wikipedia](${link})`, thumbnail: data.thumbnail?.source, page: "Wikipedia" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to fetch Wikipedia data.")] }); }
  },
};
