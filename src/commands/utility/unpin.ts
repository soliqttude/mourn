import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "unpin",
  description: "Unpin a message by URL or message ID.",
  usage: "unpin <message link or ID>",
  examples: ["unpin https://discord.com/channels/..."],
  category: "utility",
  permission: "mod",
  guildOnly: true,
  options: [{ name: "message", description: "Message link or ID", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const input = ctx.getString("message") ?? ctx.args[0] ?? "";
    const linkMatch = input.match(/channels\/\d+\/(\d+)\/(\d+)/);
    let channelId: string, messageId: string;
    if (linkMatch) { channelId = linkMatch[1]!; messageId = linkMatch[2]!; }
    else if (/^\d{17,20}$/.test(input)) { channelId = ctx.channel?.id ?? ""; messageId = input; }
    else return ctx.reply({ embeds: [errorEmbed("please provide a valid message link or ID.")] });
    try {
      const ch = await ctx.client.channels.fetch(channelId) as any;
      const msg = await ch.messages.fetch(messageId);
      await msg.unpin();
      return ctx.reply({ embeds: [successEmbed("message unpinned.")] });
    } catch (e: any) {
      return ctx.reply({ embeds: [errorEmbed(`failed to unpin: ${e.message ?? "unknown error"}`)] });
    }
  },
};
