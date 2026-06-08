import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "voicelimit",
  description: "Set the user limit for a voice channel.",
  category: "voicemaster",
  aliases: ["vclimit", "setlimit"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "channel", description: "Voice channel", type: ApplicationCommandOptionType.Channel, required: true }, { name: "limit", description: "User limit (0 = unlimited)", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel ? ctx.getChannel("channel") as any : null;
    const limit = ctx.getNumber("limit") ?? 0;
    if (!ch) return ctx.reply({ content: "Provide a voice channel.", ephemeral: true } as any);
    await ch.setUserLimit(limit, `Limit set by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(limit === 0 ? `✅ No limit set on **${ch.name}**.` : `✅ User limit set to **${limit}** on **${ch.name}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
