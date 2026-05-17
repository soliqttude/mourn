import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "steam",
  aliases: ["steamprofile", "steamlookup"], description: "Look up a Steam profile.", category: "utility",
  options: [{ name: "steamid", description: "Steam ID (17 digits) or custom URL name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const input = (ctx.getString("steamid", true) ?? ctx.args[0] ?? "").replace(/.*\/profiles\//, "").replace(/.*\/id\//, "").replace(/\/$/, "").trim();
    if (!input) return ctx.reply({ embeds: [errorEmbed("Provide a Steam ID or custom profile URL.")] });
    const profileUrl = /^\d{17}$/.test(input) ? `https://steamcommunity.com/profiles/${input}` : `https://steamcommunity.com/id/${input}`;
    return ctx.reply({ embeds: [brandEmbed({ title: "🎮 Steam Profile", description: `[View ${input}'s Steam profile](${profileUrl})`, fields: [{ name: "🔗 Profile URL", value: profileUrl, inline: false }], page: "Steam" })] });
  },
};
