import { ChannelType, PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { EmbedBuilder } from "discord.js";

export const command: HybridCommand = {
  name: "threaddelete",
  description: "Delete a thread.",
  category: "thread",
  aliases: ["deletthread"],
  guildOnly: true,
  userPermissions: ["ManageThreads"],
  options: [
    { name: "thread", description: "Thread to delete", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const thread = (ctx.getChannel ? ctx.getChannel("thread") : null) ?? ctx.channel;
    if (!thread || !("isThread" in thread) || !(thread as any).isThread?.()) return ctx.reply({ content: "You must be in a thread or specify one.", ephemeral: true } as any);
    await (thread as any).delete(`Deleted by ${ctx.user.tag}`).catch(() => null);
    if (ctx.channel?.id !== thread.id) {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Thread deleted.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
