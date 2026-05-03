import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "emojiinfo",
  description: "Get info about a custom emoji.",
  category: "utility",
  guildOnly: true,
  aliases: ["ei"],
  options: [{ name: "emoji", description: "Custom emoji", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const raw = ctx.getString("emoji", true) ?? ctx.args[0];
    if (!raw) return;
    const match = raw.match(/<a?:(\w+):(\d+)>/);
    if (!match) return ctx.reply({ embeds: [errorEmbed("Provide a custom server emoji.")] });
    const [, name, id] = match;
    const animated = raw.startsWith("<a:");
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
    return ctx.reply({
      embeds: [brandEmbed({
        title: `:${name}:`,
        thumbnail: url,
        fields: [
          { name: "ID", value: id!, inline: true },
          { name: "Name", value: name!, inline: true },
          { name: "Animated", value: animated ? "Yes" : "No", inline: true },
          { name: "URL", value: `[Open](${url})`, inline: true },
        ],
        page: "Utility",
      })],
    });
  },
};
