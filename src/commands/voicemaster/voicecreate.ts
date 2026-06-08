import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "voicecreate",
  description: "Create a voice channel.",
  category: "voicemaster",
  aliases: ["createvc", "newvc"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  options: [{ name: "name", description: "Channel name", type: ApplicationCommandOptionType.String, required: true }, { name: "limit", description: "User limit (0 for unlimited)", type: ApplicationCommandOptionType.Integer, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = ctx.getString("name") ?? ctx.args[0];
    const limit = ctx.getNumber("limit") ?? 0;
    if (!name) return ctx.reply({ content: "Provide a name.", ephemeral: true } as any);
    const vc = await ctx.guild.channels.create({ name, type: ChannelType.GuildVoice, userLimit: limit, reason: `Created by ${ctx.user.tag}` });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Voice channel **${vc.name}** created.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
