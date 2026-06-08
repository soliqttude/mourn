import { ChannelType, PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { EmbedBuilder } from "discord.js";

export const command: HybridCommand = {
  name: "threadarchive",
  description: "Archive a thread.",
  category: "thread",
  aliases: ["archivethread"],
  guildOnly: true,
  userPermissions: ["ManageThreads"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.channel as any;
    if (!ch?.isThread?.()) return ctx.reply({ content: "Run this inside a thread.", ephemeral: true } as any);
    await ch.setArchived(true, `Archived by ${ctx.user.tag}`).catch(() => null);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`📦 Thread archived.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
