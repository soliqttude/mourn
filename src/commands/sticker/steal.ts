import { ApplicationCommandOptionType, Message, StickerFormatType } from "discord.js";
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

    // resolve the target message: reply reference (prefix) or slash fallback
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
    const stickerName  = overrideName ?? sticker.name;

    const added = await ctx.guild.stickers
      .create({
        name:   stickerName,
        url:    sticker.url,
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
