import type { Client, VoiceState, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleVoiceStateUpdate as vmHandle } from "../features/voicemaster.js";
import { db } from "../db/index.js";
import { logIgnores } from "../db/schema.js";
import { and, eq, inArray } from "drizzle-orm";

async function isIgnored(guildId: string, ids: string[]): Promise<boolean> {
  const clean = ids.filter(Boolean);
  if (!clean.length) return false;
  const rows = await db.select().from(logIgnores).where(
    and(eq(logIgnores.guildId, guildId), inArray(logIgnores.targetId, clean))
  );
  return rows.length > 0;
}

export const event = {
  name: "voiceStateUpdate",
  async execute(client: Client, oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild;
    if (!guild) return;
    await vmHandle(client, oldState, newState);

    const settings = await getGuildSettings(guild.id);
    if (!settings.voiceLogChannel) return;

    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;
    if (await isIgnored(guild.id, [member.id])) return;

    const ch = guild.channels.cache.get(settings.voiceLogChannel);
    if (!ch?.isTextBased()) return;

    const avatarURL = member.user.displayAvatarURL({ size: 256 });
    let embed: EmbedBuilder | null = null;

    if (!oldState.channel && newState.channel) {
      embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: `${member.user.username} joined voice`, iconURL: avatarURL })
        .setThumbnail(avatarURL)
        .addFields(
          { name: "channel", value: `<#${newState.channel.id}> \`${newState.channel.name}\``, inline: true },
          { name: "members", value: `${newState.channel.members.size}`,                        inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `user id: ${member.id}` });

    } else if (oldState.channel && !newState.channel) {
      embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: `${member.user.username} left voice`, iconURL: avatarURL })
        .setThumbnail(avatarURL)
        .addFields(
          { name: "channel",   value: `<#${oldState.channel.id}> \`${oldState.channel.name}\``, inline: true },
          { name: "remaining", value: `${oldState.channel.members.size}`,                        inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `user id: ${member.id}` });

    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setAuthor({ name: `${member.user.username} moved channels`, iconURL: avatarURL })
        .setThumbnail(avatarURL)
        .addFields(
          { name: "from", value: `<#${oldState.channel.id}> \`${oldState.channel.name}\``, inline: true },
          { name: "to",   value: `<#${newState.channel.id}> \`${newState.channel.name}\``, inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `user id: ${member.id}` });

    } else if (!oldState.mute && newState.mute) {
      embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setAuthor({ name: `${member.user.username} server muted`, iconURL: avatarURL })
        .setThumbnail(avatarURL)
        .addFields({ name: "channel", value: newState.channel ? `<#${newState.channel.id}>` : "unknown", inline: true })
        .setTimestamp().setFooter({ text: `user id: ${member.id}` });

    } else if (oldState.mute && !newState.mute) {
      embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: `${member.user.username} server unmuted`, iconURL: avatarURL })
        .setThumbnail(avatarURL)
        .addFields({ name: "channel", value: newState.channel ? `<#${newState.channel.id}>` : "unknown", inline: true })
        .setTimestamp().setFooter({ text: `user id: ${member.id}` });

    } else if (!oldState.deaf && newState.deaf) {
      embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setAuthor({ name: `${member.user.username} server deafened`, iconURL: avatarURL })
        .setThumbnail(avatarURL)
        .addFields({ name: "channel", value: newState.channel ? `<#${newState.channel.id}>` : "unknown", inline: true })
        .setTimestamp().setFooter({ text: `user id: ${member.id}` });

    } else if (oldState.deaf && !newState.deaf) {
      embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({ name: `${member.user.username} server undeafened`, iconURL: avatarURL })
        .setThumbnail(avatarURL)
        .addFields({ name: "channel", value: newState.channel ? `<#${newState.channel.id}>` : "unknown", inline: true })
        .setTimestamp().setFooter({ text: `user id: ${member.id}` });
    }

    if (embed) await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
