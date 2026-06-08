import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "badge",
  description: "View Discord badges for a user.",
  category: "social",
  aliases: ["flags", "badges"],
  options: [{ name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const flagMap: Record<string, string> = {
      BugHunterLevel1: "🐛 Bug Hunter Level 1",
      BugHunterLevel2: "🐛 Bug Hunter Level 2",
      CertifiedModerator: "🛡️ Discord Certified Moderator",
      Hypesquad: "💎 HypeSquad Events",
      HypeSquadOnlineHouse1: "🏠 House Bravery",
      HypeSquadOnlineHouse2: "🏠 House Brilliance",
      HypeSquadOnlineHouse3: "🏠 House Balance",
      Partner: "🤝 Partnered Server Owner",
      PremiumEarlySupporter: "⭐ Early Supporter",
      Staff: "👾 Discord Staff",
      VerifiedBot: "✅ Verified Bot",
      VerifiedDeveloper: "🔨 Early Verified Bot Developer",
      ActiveDeveloper: "💻 Active Developer",
    };
    const flags = target.flags?.toArray() ?? [];
    const badgeList = flags.map(f => flagMap[f] ?? f).join("\n") || "No badges";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🏅 ${target.username}'s Badges`).setDescription(badgeList).setThumbnail(target.displayAvatarURL()).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
