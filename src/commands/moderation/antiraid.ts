import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "antiraid",
  description: "Enable or disable anti-raid mode (restricts new member actions).",
  category: "moderation",
  aliases: ["raidmode","lockserver"],
  guildOnly: true,
  userPermissions: ["Administrator"],
  options: [{ name: "enabled", description: "Enable or disable", type: ApplicationCommandOptionType.Boolean, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const enabled = ctx.getBoolean ? ctx.getBoolean("enabled") : ctx.args[0] === "true";
    if (enabled) {
      await ctx.guild.setVerificationLevel(4 as any).catch(() => null);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("🚨 Anti-Raid Mode Enabled").setDescription("Server verification level has been set to VERY HIGH. New members must have a verified phone number.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    } else {
      await ctx.guild.setVerificationLevel(1 as any).catch(() => null);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Anti-Raid Mode Disabled").setDescription("Server verification level restored to LOW.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
