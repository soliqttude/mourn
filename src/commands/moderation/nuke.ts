import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "nuke",
  description: "Clone and delete the current channel, wiping all messages.",
  category: "moderation",
  aliases: ["purgeall","channelreset"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel || ctx.channel.type === 1) return;
    const ch = ctx.channel as any;
    const position = ch.position;
    const clone = await ch.clone({ reason: `Nuked by ${ctx.user.tag}` });
    await clone.setPosition(position);
    await ch.delete();
    await clone.send({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("💥 Channel Nuked").setDescription("This channel has been nuked. All previous messages were deleted.").setFooter({ text: `Nuked by ${ctx.user.tag} • ${config.embedFooter}` }).setTimestamp()] });
  },
};
