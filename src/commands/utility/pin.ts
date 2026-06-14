import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "pin",
  description: "Pin a message by URL or message ID.",
  usage: "pin <message link or ID>",
  examples: ["pin https://discord.com/channels/..."],
  category: "utility",
  permission: "manage_messages",
  guildOnly: true,
  options: [{ name: "message", description: "Message link or ID", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const input = ctx.getString("message") ?? ctx.args[0] ?? "";
    // Parse message link: https://discord.com/channels/guildId/channelId/messageId
    const linkMatch = input.match(/channels\/\d+\/(\d+)\/(\d+)/);
    let channelId: string, messageId: string;
    if (linkMatch) {
      channelId = linkMatch[1]!;
      messageId = linkMatch[2]!;
    } else if (/^\d{17,20}$/.test(input)) {
      channelId = ctx.channel?.id ?? "";
      messageId = input;
    } else {
      return ctx.reply({ embeds: [errorEmbed("Please provide a valid message link or ID.")] });
    }
    try {
      const ch = await ctx.client.channels.fetch(channelId) as any;
      if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Couldn't resolve that **channel**.")] });
      const msg = await ch.messages.fetch(messageId);
      await msg.pin();
      return ctx.reply({ embeds: [successEmbed("Message pinned.")] });
    } catch (e: any) {
      return ctx.reply({ embeds: [errorEmbed(`failed to pin: ${e.message ?? "unknown error"}`)] });
    }
  },
};
