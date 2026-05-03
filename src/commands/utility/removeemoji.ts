import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "removeemoji",
  description: "Remove an emoji from the server.",
  category: "utility",
  permission: "admin",
  guildOnly: true,
  aliases: ["delemoji", "deleteemoji"],
  options: [{ name: "emoji", description: "Emoji to remove", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const raw = ctx.getString("emoji", true) ?? ctx.args[0];
    if (!raw) return;
    const match = raw.match(/<a?:\w+:(\d+)>/);
    if (!match) return ctx.reply({ embeds: [errorEmbed("Provide a custom server emoji.")] });
    const id = match[1]!;
    const emoji = ctx.guild.emojis.cache.get(id);
    if (!emoji) return ctx.reply({ embeds: [errorEmbed("Emoji not found in this server.")] });
    const name = emoji.name;
    await emoji.delete();
    return ctx.reply({ embeds: [successEmbed(`Removed emoji **:${name}:**.`)] });
  },
};
