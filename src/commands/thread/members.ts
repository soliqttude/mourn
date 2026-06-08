import { ChannelType, PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { EmbedBuilder } from "discord.js";

export const command: HybridCommand = {
  name: "threadmembers",
  description: "List members of the current thread.",
  category: "thread",
  aliases: ["threadlist"],
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.channel as any;
    if (!ch?.isThread?.()) return ctx.reply({ content: "Run this inside a thread.", ephemeral: true } as any);
    const members = await ch.members.fetch().catch(() => null);
    if (!members) return ctx.reply({ content: "Could not fetch members.", ephemeral: true } as any);
    const names = members.map((m: any) => `<@${m.id}>`).slice(0, 30);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🧵 Thread Members (${members.size})`).setDescription(names.join(", ") || "No members.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
