import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { getSnipe, getSnipeCount } from "../../features/snipes.js";
import { config } from "../../config.js";

const isImage = (url: string) => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);

export const command: HybridCommand = {
  name: "snipe",
  aliases: ["s"],
  description: "Show the last deleted message in this channel.",
  usage: "snipe [index]",
  examples: ["snipe", "snipe 2"],
  category: "utility",
  guildOnly: true,
  options: [
    {
      type: ApplicationCommandOptionType.Integer,
      name: "index",
      description: "Which deleted message to show (1 = most recent)",
      required: false,
      minValue: 1,
      maxValue: 10,
    },
  ],
  async execute(ctx) {
    if (!ctx.channel) return;
    const index = Math.max(0, (ctx.getNumber("index") ?? 1) - 1);
    const snipe = getSnipe(ctx.channel.id, "delete", index);
    const total = getSnipeCount(ctx.channel.id, "delete");
    if (!snipe) return ctx.reply({ embeds: [errorEmbed("There's nothing to snipe.")] });

    const channelName =
      snipe.channelName ??
      ("name" in ctx.channel ? (ctx.channel as any).name as string : "unknown");
    const current = index + 1;

    const imageAttachment = snipe.attachments?.find(isImage);
    const otherAttachments = snipe.attachments?.filter((a) => !isImage(a)) ?? [];

    const lines: string[] = [];

    if (snipe.replyTo) {
      const replyPreview = snipe.replyTo.content.slice(0, 80).replace(/\n/g, " ");
      lines.push(`> **${snipe.replyTo.authorTag}**: ${replyPreview}${snipe.replyTo.content.length > 80 ? "…" : ""}`);
    }

    if (snipe.content) {
      lines.push(snipe.content);
    } else if (!snipe.attachments?.length && !snipe.stickers?.length) {
      lines.push("*(no content)*");
    }

    if (otherAttachments.length) {
      lines.push(otherAttachments.map((a) => `[attachment](${a})`).join("  ·  "));
    }

    if (snipe.stickers?.length) {
      lines.push(`*${snipe.stickers.length} sticker${snipe.stickers.length > 1 ? "s" : ""}*`);
    }

    lines.push(`-# deleted <t:${Math.floor(snipe.at / 1000)}:R>`);

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setAuthor({ name: snipe.authorTag, iconURL: snipe.authorAvatar ?? undefined })
      .setDescription(lines.join("\n"))
      .setTimestamp(snipe.sentAt ?? snipe.at)
      .setFooter({ text: `${current} of ${total}  ·  #${channelName}` });

    if (imageAttachment) embed.setImage(imageAttachment);

    return ctx.reply({ embeds: [embed] });
  },
};
