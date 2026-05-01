import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { formatRelative } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "serverinfo",
  aliases: ["guildinfo", "si"],
  description: "Show information about this server.",
  category: "utility",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const owner = await ctx.guild.fetchOwner().catch(() => null);
    const fields = [
      { name: "Owner", value: owner ? `<@${owner.id}>` : "Unknown", inline: true },
      { name: "ID", value: ctx.guild.id, inline: true },
      { name: "Created", value: formatRelative(ctx.guild.createdAt), inline: true },
      { name: "Members", value: String(ctx.guild.memberCount), inline: true },
      { name: "Channels", value: String(ctx.guild.channels.cache.size), inline: true },
      { name: "Roles", value: String(ctx.guild.roles.cache.size), inline: true },
      { name: "Boosts", value: `${ctx.guild.premiumSubscriptionCount ?? 0}`, inline: true },
      { name: "Boost Tier", value: String(ctx.guild.premiumTier), inline: true },
      { name: "Verification", value: String(ctx.guild.verificationLevel), inline: true },
    ];
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: ctx.guild.name,
          thumbnail: ctx.guild.iconURL({ size: 256 }) ?? undefined,
          image: ctx.guild.bannerURL({ size: 1024 }) ?? undefined,
          fields,
          page: "Serverinfo",
        }),
      ],
    });
  },
};
