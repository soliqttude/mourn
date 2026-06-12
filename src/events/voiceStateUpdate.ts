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

    const avatarURL = member.user.displayAvatarURL({ size: 64 });
    let label: string | null = null;
    let fields: { name: string; value: string; inline: boolean }[] = [];

    if (!oldState.channel && newState.channel) {
      label = `${member.user.username} — joined voice`;
      fields = [
        { name: "channel", value: `<#${newState.channel.id}> \`${newState.channel.name}\``, inline: true },
        { name: "members", value: `${newState.channel.members.size}`,                        inline: true },
      ];
    } else if (oldState.channel && !newState.channel) {
      label = `${member.user.username} — left voice`;
      fields = [
        { name: "channel",   value: `<#${oldState.channel.id}> \`${oldState.channel.name}\``, inline: true },
        { name: "remaining", value: `${oldState.channel.members.size}`,                        inline: true },
      ];
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      label = `${member.user.username} — moved channels`;
      fields = [
        { name: "from", value: `<#${oldState.channel.id}> \`${oldState.channel.name}\``, inline: true },
        { name: "to",   value: `<#${newState.channel.id}> \`${newState.channel.name}\``, inline: true },
      ];
    } else if (!oldState.mute && newState.mute) {
      label = `${member.user.username} — server muted`;
      fields = [{ name: "channel", value: newState.channel ? `<#${newState.channel.id}>` : "unknown", inline: true }];
    } else if (oldState.mute && !newState.mute) {
      label = `${member.user.username} — server unmuted`;
      fields = [{ name: "channel", value: newState.channel ? `<#${newState.channel.id}>` : "unknown", inline: true }];
    } else if (!oldState.deaf && newState.deaf) {
      label = `${member.user.username} — server deafened`;
      fields = [{ name: "channel", value: newState.channel ? `<#${newState.channel.id}>` : "unknown", inline: true }];
    } else if (oldState.deaf && !newState.deaf) {
      label = `${member.user.username} — server undeafened`;
      fields = [{ name: "channel", value: newState.channel ? `<#${newState.channel.id}>` : "unknown", inline: true }];
    }

    if (!label) return;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: label, iconURL: avatarURL })
      .addFields(...fields)
      .setTimestamp()
      .setFooter({ text: `user id: ${member.id}` });

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
