import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "ownersay",
  description: "(Owner only) Make the bot speak in any channel of any server.",
  usage: "ownersay [channel_id] [message]",
  examples: ["ownersay"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "channel_id", description: "Channel ID", type: ApplicationCommandOptionType.String, required: true },
    { name: "message", description: "Message to send", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const channelId = ctx.getString("channel_id", true) ?? ctx.args[0];
    const msg = ctx.getString("message", true) ?? ctx.args.slice(1).join(" ");
    if (!channelId || !msg) return ctx.reply({ content: "Usage: `ownersay <channelId> <message>`" });
    const channel = ctx.client.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return ctx.reply({ content: "Channel not found or not a text channel." });
    try {
      await (channel as any).send(msg);
      return ctx.reply({ content: "✅ Sent.", ephemeral: true });
    } catch (err) {
      return ctx.reply({ content: `Failed: ${(err as Error).message}` });
    }
  },
};
