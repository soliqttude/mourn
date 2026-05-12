import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "servermembers",
  description: "(Owner) Detailed member stats for any server.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID to inspect", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    const guildId = ctx.getString("guild_id", true)!;
    const guild = ctx.client.guilds.cache.get(guildId);
    if (!guild) return ctx.reply({ embeds: [errorEmbed(`bot is not in guild \`${guildId}\`.`)] });

    const members = await guild.members.fetch().catch(() => null);
    if (!members) return ctx.reply({ embeds: [errorEmbed("failed to fetch members.")] });

    const total = members.size;
    const bots = members.filter(m => m.user.bot).size;
    const humans = total - bots;
    const online = members.filter(m => m.presence?.status === "online").size;
    const idle = members.filter(m => m.presence?.status === "idle").size;
    const dnd = members.filter(m => m.presence?.status === "dnd").size;
    const offline = members.filter(m => !m.presence || m.presence.status === "offline").size;
    const boosters = guild.premiumSubscriptionCount ?? 0;
    const boostTier = guild.premiumTier;
    const oldestMember = members.sort((a, b) => (a.joinedTimestamp ?? 0) - (b.joinedTimestamp ?? 0)).first();
    const newestMember = members.sort((a, b) => (b.joinedTimestamp ?? 0) - (a.joinedTimestamp ?? 0)).first();

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle(`👥 ${guild.name} — member stats`)
          .setThumbnail(guild.iconURL() ?? null)
          .addFields(
            { name: "total members", value: total.toLocaleString(), inline: true },
            { name: "humans", value: humans.toLocaleString(), inline: true },
            { name: "bots", value: bots.toLocaleString(), inline: true },
            { name: "🟢 online", value: online.toLocaleString(), inline: true },
            { name: "🌙 idle", value: idle.toLocaleString(), inline: true },
            { name: "🔴 dnd", value: dnd.toLocaleString(), inline: true },
            { name: "⚫ offline", value: offline.toLocaleString(), inline: true },
            { name: "🚀 boosters", value: `${boosters} (tier ${boostTier})`, inline: true },
            { name: "oldest member", value: oldestMember ? `${oldestMember.user.username} (<t:${Math.floor((oldestMember.joinedTimestamp ?? 0) / 1000)}:D>)` : "unknown", inline: false },
            { name: "newest member", value: newestMember ? `${newestMember.user.username} (<t:${Math.floor((newestMember.joinedTimestamp ?? 0) / 1000)}:D>)` : "unknown", inline: false },
          )
          .setFooter({ text: config.embedFooter })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
};
