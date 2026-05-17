import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "jumbo",
  aliases: ["bigemoji", "enlargeemoji", "e"],
  description: "Enlarge a custom emoji.",
  category: "utility",
  options: [{ name: "emoji", description: "Custom emoji to enlarge", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const raw = ctx.getString("emoji", true) ?? ctx.args[0];
    if (!raw) return;
    const match = raw.match(/<a?:(\w+):(\d+)>/);
    if (!match) return ctx.reply({ embeds: [errorEmbed("Provide a custom emoji.")] });
    const [, name, id] = match;
    const animated = raw.startsWith("<a:");
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=512`;
    return ctx.reply({ embeds: [brandEmbed({ title: `:${name}:`, image: url, page: "Utility" })] });
  },
};
