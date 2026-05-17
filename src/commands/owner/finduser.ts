import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "finduser",
  description: "(Owner only) Find any user and show where they share servers with the bot.",
  usage: "finduser [user_id]",
  examples: ["finduser"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "user_id", description: "User ID", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const userId = ctx.getString("user_id", true) ?? ctx.rawArgs.trim();
    if (!userId) return ctx.reply({ content: "Provide a user ID." });
    await ctx.defer(true);
    const user = await ctx.client.users.fetch(userId).catch(() => null);
    if (!user) return ctx.reply({ content: "User not found in Discord cache." });
    const sharedGuilds = ctx.client.guilds.cache.filter(g => g.members.cache.has(userId));
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`🔎 User Found — ${user.tag}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
        { name: `Shared Servers (${sharedGuilds.size})`, value: sharedGuilds.size
          ? sharedGuilds.map(g => `**${g.name}** \`${g.id}\``).slice(0, 10).join("\n")
          : "None cached" },
      )
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb] });
  },
};
