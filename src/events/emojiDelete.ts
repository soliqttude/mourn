import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder, GuildEmoji, AuditLogEvent } from "discord.js";
import { handleAntinukeAction } from "../features/antinuke.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "emojiDelete",
  async execute(client: Client, emoji: GuildEmoji) {
    if (!emoji.guild) return;
    await handleAntinukeAction(client, emoji.guild, "emoji_delete", emoji.id).catch(() => {});

    const settings = await getGuildSettings(emoji.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = emoji.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    let executor: string | null = null;
    try {
      const audit = await emoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.targetId === emoji.id && (Date.now() - entry.createdTimestamp) < 5000)
        executor = entry.executorId ?? null;
    } catch {}

    const guildIcon = emoji.guild.iconURL({ size: 64 }) ?? undefined;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "Emoji Deleted", iconURL: guildIcon })
      .setDescription(
        `Emoji \`:${emoji.name}:\` was deleted${executor ? ` by <@${executor}>` : ""}`
      )
      .addFields(
        { name: "Animated", value: emoji.animated ? "yes" : "no", inline: true },
        { name: "Managed",  value: emoji.managed ? "yes" : "no",  inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Emoji ID: ${emoji.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
