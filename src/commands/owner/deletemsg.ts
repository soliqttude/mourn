import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "deletemsg",
  description: "(Owner) Delete any message anywhere by channel ID + message ID.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "channel_id", description: "Channel ID", type: ApplicationCommandOptionType.String, required: true },
    { name: "message_id", description: "Message ID", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    const channelId = ctx.getString("channel_id", true)!;
    const messageId = ctx.getString("message_id", true)!;

    let channel: any;
    for (const guild of ctx.client.guilds.cache.values()) {
      const ch = guild.channels.cache.get(channelId);
      if (ch) { channel = ch; break; }
    }
    if (!channel) channel = ctx.client.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("channel not found.")] });

    try {
      const msg = await channel.messages.fetch(messageId);
      await msg.delete();
      return ctx.reply({ embeds: [successEmbed(`message \`${messageId}\` deleted from <#${channelId}>.`)], ephemeral: true });
    } catch (e: any) {
      return ctx.reply({ embeds: [errorEmbed(`failed: ${e?.message ?? "unknown"}`)] });
    }
  },
};
