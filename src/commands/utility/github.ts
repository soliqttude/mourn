import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "github",
  description: "Look up a GitHub user or repository.",
  category: "utility",
  aliases: ["gh", "gituser"],
  options: [{ name: "query", description: "Username or username/repo", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const query = ctx.getString("query") ?? ctx.args[0];
    if (!query) return ctx.reply({ content: "Provide a username or repo.", ephemeral: true } as any);
    const isRepo = query.includes("/");
    try {
      const url = isRepo ? `https://api.github.com/repos/${query}` : `https://api.github.com/users/${query}`;
      const res = await fetch(url, { headers: { "User-Agent": "mourn-bot" } });
      if (!res.ok) throw new Error("Not found");
      const data = await res.json() as any;
      if (isRepo) {
        return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x24292e).setTitle(`📦 ${data.full_name}`).setDescription(data.description ?? "No description.").addFields({ name: "⭐ Stars", value: data.stargazers_count.toString(), inline: true },{ name: "🍴 Forks", value: data.forks_count.toString(), inline: true },{ name: "👁️ Watchers", value: data.watchers_count.toString(), inline: true },{ name: "Language", value: data.language ?? "Unknown", inline: true },{ name: "Issues", value: data.open_issues_count.toString(), inline: true },{ name: "License", value: data.license?.name ?? "None", inline: true }).setURL(data.html_url).setFooter({ text: config.embedFooter }).setTimestamp()] });
      } else {
        return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x24292e).setTitle(`👤 ${data.login}`).setDescription(data.bio ?? "No bio.").setThumbnail(data.avatar_url).addFields({ name: "Repos", value: data.public_repos.toString(), inline: true },{ name: "Followers", value: data.followers.toString(), inline: true },{ name: "Following", value: data.following.toString(), inline: true },{ name: "Name", value: data.name ?? "N/A", inline: true },{ name: "Location", value: data.location ?? "N/A", inline: true }).setURL(data.html_url).setFooter({ text: config.embedFooter }).setTimestamp()] });
      }
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`Could not find **${query}** on GitHub.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
