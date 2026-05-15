import {
  type Client,
  type MessageReaction,
  type TextChannel,
  EmbedBuilder,
} from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { shameMessages, shameConfig } from "../db/schema.js";

const SHAME_EMOJIS = new Set(["😭", "💀"]);

export async function handleShameReaction(
  _client: Client,
  reaction: MessageReaction
) {
  const message = reaction.message;
  if (!message.guild || !message.author) return;
  if (message.author.bot) return;

  const emojiName = reaction.emoji.name ?? "";
  if (!SHAME_EMOJIS.has(emojiName)) return;

  // Load shame config from its own table (never touches guild_settings)
  const configRows = await db
    .select()
    .from(shameConfig)
    .where(eq(shameConfig.guildId, message.guild.id))
    .catch(() => []);
  const cfg = configRows[0];
  if (!cfg) return;

  const shameChannel = message.guild.channels.cache.get(cfg.channelId);
  if (!shameChannel?.isTextBased()) return;

  // Count total shame reactions (😭 + 💀 combined)
  let totalCount = 0;
  for (const r of message.reactions.cache.values()) {
    if (SHAME_EMOJIS.has(r.emoji.name ?? "")) {
      totalCount += r.count ?? 0;
    }
  }

  if (totalCount < (cfg.threshold ?? 3)) return;

  const existingRows = await db
    .select()
    .from(shameMessages)
    .where(eq(shameMessages.originalMessageId, message.id))
    .catch(() => []);
  const existing = existingRows[0];

  const channelName = (message.channel as any).name ?? "unknown";
  const timeStr = new Date(message.createdTimestamp).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const embed = new EmbedBuilder()
    .setColor(0x111116)
    .setAuthor({
      name: message.member?.displayName ?? message.author.username,
      iconURL: message.author.displayAvatarURL(),
    })
    .setDescription(message.content || "*No content*")
    .addFields({
      name: `# · ${channelName}`,
      value: `[Jump to message](${message.url})\n\nToday at ${timeStr}`,
    });

  const firstImage = message.attachments.find(a => a.contentType?.startsWith("image/"));
  if (firstImage) embed.setImage(firstImage.url);

  const header = `💀 **#${totalCount}**`;

  if (existing) {
    try {
      const old = await (shameChannel as TextChannel).messages.fetch(existing.shameMessageId);
      await old.edit({ content: header, embeds: [embed] });
      await db
        .update(shameMessages)
        .set({ count: totalCount })
        .where(eq(shameMessages.originalMessageId, message.id));
    } catch {
      /* shame post was deleted, ignore */
    }
  } else {
    const sent = await (shameChannel as TextChannel)
      .send({ content: header, embeds: [embed] })
      .catch(() => null);
    if (sent) {
      await db.insert(shameMessages).values({
        originalMessageId: message.id,
        guildId: message.guild.id,
        shameMessageId: sent.id,
        count: totalCount,
      }).catch(() => {});
    }
  }
}
