import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "botrename",
  description: "(Owner only) Change the bot's username and/or avatar.",
  usage: "botrename [username] [avatar_url]",
  examples: ["botrename"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "username", description: "New username", type: ApplicationCommandOptionType.String, required: false },
    { name: "avatar_url", description: "New avatar URL", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const username = ctx.getString("username");
    const avatarUrl = ctx.getString("avatar_url");
    if (!username && !avatarUrl) return ctx.reply({ content: "Provide a username or avatar URL." });
    await ctx.defer(true);
    const updates: string[] = [];
    try {
      if (username) { await ctx.client.user?.setUsername(username); updates.push(`Username → \`${username}\``); }
      if (avatarUrl) { await ctx.client.user?.setAvatar(avatarUrl); updates.push("Avatar updated"); }
    } catch (err) {
      return ctx.reply({ content: `Failed: ${(err as Error).message}` });
    }
    const eb = new EmbedBuilder()
      .setColor(config.successColor)
      .setTitle("✏️ Bot Renamed")
      .setDescription(updates.join("\n"))
      .setThumbnail(ctx.client.user?.displayAvatarURL() ?? null)
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb] });
  },
};
