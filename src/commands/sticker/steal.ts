import { ApplicationCommandOptionType, Message, StickerFormatType, AttachmentBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "stickersteal",
  description: "Reply to a sticker message to steal it into this server.",
  category: "sticker",
  aliases: ["stealsticker", "grabsticker", "yoinksticker"],
  guildOnly: true,
  userPermissions: ["ManageEmojisAndStickers"],
  options: [
    { name: "name", description: "Override name for the sticker", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;

    // resolve the replied-to message
    let targetMsg: Message | null = null;
    if (ctx.source === "prefix") {
      const raw = ctx.raw as Message;
      if (raw.reference?.messageId) {
        targetMsg = await (ctx.channel as any).messages
          .fetch(raw.reference.messageId)
          .catch(() => null);
      }
    }

    if (!targetMsg) {
      return ctx.reply({ embeds: [errorEmbed("Reply to a message that contains a sticker.")] });
    }

    const sticker = targetMsg.stickers?.first();
    if (!sticker) {
      return ctx.reply({ embeds: [errorEmbed("That message doesn't have a sticker.")] });
    }

    if (sticker.format === StickerFormatType.Lottie) {
      return ctx.reply({ embeds: [errorEmbed("Lottie stickers can't be stolen — Discord only allows bots to upload PNG/APNG stickers.")] });
    }

    const overrideName = ctx.getString("name") ?? ctx.args[0];
    const stickerName  = (overrideName ?? sticker.name).slice(0, 30);

    // download the sticker as a buffer — discord.js v14 needs file: not url:
    const ext = sticker.format === StickerFormatType.GIF ? "gif" : "png";
    let fileBuffer: Buffer;
    try {
      const res = await fetch(sticker.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fileBuffer = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      return ctx.reply({ embeds: [errorEmbed(`Failed to download sticker: ${(e as Error).message}`)] });
    }

    const attachment = new AttachmentBuilder(fileBuffer, { name: `sticker.${ext}` });

    const added = await ctx.guild.stickers
      .create({
        file:   attachment,
        name:   stickerName,
        tags:   "⭐",
        reason: `Stolen by ${ctx.user.tag}`,
      })
      .catch((e: Error) => e);

    if (added instanceof Error) {
      return ctx.reply({ embeds: [errorEmbed(`Failed to steal sticker: ${added.message}`)] });
    }

    return ctx.reply({
      embeds: [
        successEmbed(`Sticker **${added.name}** has been added to the server.`)
          .setThumbnail(sticker.url),
      ],
    });
  },
};
