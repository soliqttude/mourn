import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "botsay",
  description: "(Owner) Make the bot send a message in any channel.",
  category: "owner",
  ownerOnly: true,
  aliases: ["botspeak", "say2"],
  options: [
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "message", description: "Message to send", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const channelId = (ctx.getChannel?.("channel") as any)?.id ?? ctx.args[0]?.replace(/[<#>]/g, "");
    const message = ctx.getString("message") ?? ctx.args.slice(1).join(" ");
    if (!channelId || !message) return ctx.reply({ content: "Provide a channel and message." });

    const ch = ctx.client.channels.cache.get(channelId) as any;
    if (!ch?.isTextBased?.()) return ctx.reply({ content: "Invalid text channel." });

    try {
      await ch.send(message);
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00e676)
            .setTitle("✅ Message Sent")
            .addFields(
              { name: "Channel", value: `<#${channelId}>`, inline: true },
              { name: "Content", value: message.slice(0, 200), inline: false },
            )
            .setFooter({ text: `${config.embedFooter} • Owner Action` })
            .setTimestamp(),
        ],
        ephemeral: true,
      } as any);
    } catch (err: any) {
      return ctx.reply({ content: `Failed: ${err.message}` });
    }
  },
};
