import { ChannelType, PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { EmbedBuilder } from "discord.js";

export const command: HybridCommand = {
  name: "thread",
  description: "Create a new thread in the current channel.",
  category: "thread",
  aliases: ["threadcreate"],
  guildOnly: true,
  userPermissions: ["ManageThreads"],
  options: [
    { name: "name", description: "Thread name", type: ApplicationCommandOptionType.String, required: true },
    { name: "private", description: "Make the thread private", type: ApplicationCommandOptionType.Boolean, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel || ctx.channel.type === ChannelType.DM) return;
    const name = ctx.getString("name") ?? ctx.args[0];
    if (!name) return ctx.reply({ content: "Provide a thread name.", ephemeral: true } as any);
    const isPrivate = ctx.getBoolean("private") ?? false;
    const ch = ctx.channel as any;
    if (!ch.threads) return ctx.reply({ content: "Threads are not supported in this channel.", ephemeral: true } as any);
    const thread = await ch.threads.create({
      name,
      type: isPrivate ? ChannelType.PrivateThread : ChannelType.PublicThread,
      reason: `Created by ${ctx.user.tag}`,
    }).catch(() => null);
    if (!thread) return ctx.reply({ content: "Failed to create thread.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Created thread **${thread.name}** (<#${thread.id}>).`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
