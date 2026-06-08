import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "resetxp",
  description: "Reset a user's XP and level.",
  category: "levels",
  aliases: ["clearxp", "wipelevel"],
  guildOnly: true,
  options: [{ name: "user", description: "User to reset (or 'all' for server reset)", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    if (target) {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`✅ Reset **${target.username}'s** XP and level.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription("✅ Server XP reset is not yet implemented. Coming soon.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
