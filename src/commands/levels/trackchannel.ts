import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "trackchannel",
  description: "Set the channel for level-up announcements.",
  category: "levels",
  aliases: ["lvlchannel", "levelupchannel"],
  guildOnly: true,
  options: [{ name: "channel", description: "Announcement channel", type: ApplicationCommandOptionType.Channel, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel ? ctx.getChannel("channel") : null;
    if (!ch) return ctx.reply({ content: "Provide a channel.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Level-up announcements will be sent to <#${(ch as any).id}>.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
