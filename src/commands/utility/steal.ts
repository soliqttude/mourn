import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "steal",
  aliases: ["copyemoji", "grabemoji"],
  description: "Steal an emoji from another server and add it here.",
  usage: "steal [emoji] [name]",
  examples: ["steal"],
  category: "utility",
  permission: "manage_expressions",
  guildOnly: true,
  options: [
    { name: "emoji", description: "Emoji to steal", type: ApplicationCommandOptionType.String, required: true },
    { name: "name", description: "New name (optional)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const raw = ctx.getString("emoji", true) ?? ctx.args[0];
    const customName = ctx.getString("name") ?? ctx.args[1];
    if (!raw) return;
    const match = raw.match(/<a?:(\w+):(\d+)>/);
    if (!match) return ctx.reply({ embeds: [errorEmbed("Provide a custom **emoji** to steal.")] });
    const [, name, id] = match;
    const animated = raw.startsWith("<a:");
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
    try {
      const emoji = await ctx.guild.emojis.create({ attachment: url, name: customName ?? name! });
      return ctx.reply({ embeds: [successEmbed(`Added emoji **:${emoji.name}:** ${emoji}`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed(`Failed to add emoji: ${(err as Error).message}`)] });
    }
  },
};
