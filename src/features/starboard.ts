import {
  type Client,
  type MessageReaction,
  type TextChannel,
  EmbedBuilder,
} from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { starboardMessages } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";

export async function handleStarboardReaction(
  client: Client,
  reaction: MessageReaction
) {
  const message = reaction.message;
  if (!message.guild) return;
  const settings = await getGuildSettings(message.guild.id);
  if (!settings.starboardChannel) return;
  const emoji = settings.starboardEmoji || "⭐";
  if (reaction.emoji.name !== emoji && reaction.emoji.toString() !== emoji) return;
  const count = reaction.count ?? 0;
  const channel = message.guild.channels.cache.get(settings.starboardChannel);
  if (!channel?.isTextBased()) return;

  const existingRows = await db
    .select()
    .from(starboardMessages)
    .where(eq(starboardMessages.originalMessageId, message.id));
  const existing = existingRows[0];

  if (count >= settings.starboardThreshold) {
    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setAuthor({
        name: message.author?.tag ?? "Unknown",
        iconURL: message.author?.displayAvatarURL(),
      })
      .setDescription(message.content || "*No content*")
      .addFields({ name: "Source", value: `[Jump](${message.url})` })
      .setFooter({ text: `${emoji} ${count} • ${message.channel.id}` })
      .setTimestamp(message.createdAt);

    const firstAttachment = message.attachments?.first();
    if (firstAttachment?.contentType?.startsWith("image/")) {
      embed.setImage(firstAttachment.url);
    }

    if (existing) {
      try {
        const old = await (channel as TextChannel).messages.fetch(
          existing.starboardMessageId
        );
        await old.edit({ embeds: [embed] });
        await db
          .update(starboardMessages)
          .set({ stars: count })
          .where(eq(starboardMessages.originalMessageId, message.id));
      } catch {
        /* old message gone */
      }
    } else {
      const sent = await (channel as TextChannel).send({ embeds: [embed] }).catch(() => null);
      if (sent) {
        await db.insert(starboardMessages).values({
          guildId: message.guild.id,
          originalMessageId: message.id,
          starboardMessageId: sent.id,
          stars: count,
        });
      }
    }
  } else if (existing) {
    await db
      .update(starboardMessages)
      .set({ stars: count })
      .where(eq(starboardMessages.originalMessageId, message.id));
  }
}
