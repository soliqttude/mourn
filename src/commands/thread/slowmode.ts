import { ChannelType, PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { EmbedBuilder } from "discord.js";

export const command: HybridCommand = {
  name: "threadslowmode",
  description: "Set slowmode on a thread.",
  category: "thread",
  aliases: ["threadratelimit"],
  guildOnly: true,
  userPermissions: ["ManageThreads"],
  options: [{ name: "seconds", description: "Slowmode in seconds (0 to disable)", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const secs = ctx.getNumber("seconds") ?? parseInt(ctx.args[0] ?? "0");
    const ch = ctx.channel as any;
    if (!ch?.isThread?.()) return ctx.reply({ content: "Run this inside a thread.", ephemeral: true } as any);
    await ch.setRateLimitPerUser(secs).catch(() => null);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(secs === 0 ? `✅ Slowmode disabled.` : `✅ Slowmode set to **${secs}s**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
