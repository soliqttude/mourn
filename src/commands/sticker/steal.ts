import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "stickersteal",
  description: "Steal a sticker from a message and add it to the server.",
  category: "sticker",
  aliases: ["grabsticker", "yoinksticker"],
  guildOnly: true,
  userPermissions: ["ManageEmojisAndStickers"],
  options: [{ name: "message_id", description: "Message ID containing the sticker", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel || ctx.channel.type === 1) return;
    const msgId = ctx.getString("message_id") ?? ctx.args[0];
    if (!msgId) return ctx.reply({ content: "Provide a message ID.", ephemeral: true } as any);
    const msg = await (ctx.channel as any).messages.fetch(msgId).catch(() => null);
    if (!msg) return ctx.reply({ content: "Message not found.", ephemeral: true } as any);
    const sticker = msg.stickers?.first();
    if (!sticker) return ctx.reply({ content: "No sticker found on that message.", ephemeral: true } as any);
    const added = await ctx.guild.stickers.create({ name: sticker.name, url: sticker.url, tags: "⭐", reason: `Stolen by ${ctx.user.tag}` }).catch((e: Error) => e);
    if (added instanceof Error) return ctx.reply({ content: `Failed: ${added.message}`, ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Sticker Stolen").setDescription(`**${sticker.name}** added to the server.`).setImage(sticker.url).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
