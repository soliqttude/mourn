import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "github", aliases: ["gh"], description: "Look up a GitHub user or repository.", category: "utility",
  options: [{ name: "query", description: "Username or user/repo", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const query = (ctx.getString("query", true) ?? ctx.args[0] ?? "").trim();
    if (!query) return ctx.reply({ embeds: [errorEmbed("Please provide a GitHub username or user/repo.")] });
    try {
      const isRepo = query.includes("/");
      const url = isRepo ? `https://api.github.com/repos/${query}` : `https://api.github.com/users/${query}`;
      const res = await fetch(url, { headers: { "User-Agent": "bleed-bot/1.0" } });
      if (!res.ok) return ctx.reply({ embeds: [errorEmbed(`Not found: **${query}**`)] });
      const d = await res.json() as any;
      if (isRepo) {
        return ctx.reply({ embeds: [brandEmbed({ title: `📦 ${d.full_name}`, description: d.description ?? "No description.", thumbnail: d.owner?.avatar_url, fields: [{ name: "⭐ Stars", value: String(d.stargazers_count), inline: true }, { name: "🔀 Forks", value: String(d.forks_count), inline: true }, { name: "🔤 Language", value: d.language ?? "Unknown", inline: true }, { name: "🔗 Link", value: d.html_url, inline: false }], page: "GitHub" })] });
      }
      return ctx.reply({ embeds: [brandEmbed({ title: `👤 ${d.login}`, description: d.bio ?? "No bio.", thumbnail: d.avatar_url, fields: [{ name: "📦 Repos", value: String(d.public_repos), inline: true }, { name: "👥 Followers", value: String(d.followers), inline: true }, { name: "📍 Location", value: d.location ?? "—", inline: true }, { name: "🔗 Link", value: d.html_url, inline: false }], page: "GitHub" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to fetch GitHub data.")] }); }
  },
};
