import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getGuildSettings } from "../../db/settings.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "google",
  description: "Search Google.",
  usage: "google <search terms>",
  examples: ["google discord.js slash commands"],
  category: "utility",
  options: [
    { name: "query", description: "What to search for", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const query = (ctx.getString("query") ?? ctx.args.join(" ")).trim();
    if (!query) {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("Provide something to search for.")] });
    }
    let safeSearch = false;
    if (ctx.guild) {
      const settings = await getGuildSettings(ctx.guild.id);
      safeSearch = settings.googleSafeSearch;
    }
    const url = new URL("https://www.google.com/search");
    url.searchParams.set("q", query);
    url.searchParams.set("safe", safeSearch ? "active" : "off");
    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle("Google search")
      .setDescription(`[${query.replace(/\[/g, "\\[").replace(/\]/g, "\\]")}](${url.toString()})`)
      .setFooter({ text: `SafeSearch ${safeSearch ? "enabled" : "disabled"}` });
    return ctx.reply({ embeds: [embed] });
  },
};
