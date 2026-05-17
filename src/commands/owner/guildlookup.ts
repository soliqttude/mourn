import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "guildlookup",
  description: "(Owner only) Get full info on any server by ID.",
  usage: "guildlookup [guild_id]",
  examples: ["guildlookup"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const guildId = ctx.getString("guild_id", true) ?? ctx.rawArgs.trim();
    if (!guildId) return ctx.reply({ content: "Provide a guild ID." });
    const guild = ctx.client.guilds.cache.get(guildId);
    if (!guild) return ctx.reply({ content: "Bot is not in that server." });
    const owner = await guild.fetchOwner().catch(() => null);
    const roles = guild.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position);
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: "Guild ID", value: guild.id, inline: true },
        { name: "Owner", value: owner ? `${owner.user.tag}\n\`${owner.id}\`` : "Unknown", inline: true },
        { name: "Members", value: guild.memberCount.toLocaleString(), inline: true },
        { name: "Channels", value: guild.channels.cache.size.toString(), inline: true },
        { name: "Roles", value: guild.roles.cache.size.toString(), inline: true },
        { name: "Emojis", value: guild.emojis.cache.size.toString(), inline: true },
        { name: "Boost Level", value: `Level ${guild.premiumTier}`, inline: true },
        { name: "Boosts", value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
        { name: "Verification", value: guild.verificationLevel.toString(), inline: true },
        { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Top Roles", value: roles.first(5).map(r => r.toString()).join(" ") || "None", inline: false },
      )
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
