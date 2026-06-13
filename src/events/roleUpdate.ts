import type { Client, Role, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "roleUpdate",
  async execute(client: Client, oldRole: Role, newRole: Role) {
    const settings    = await getGuildSettings(newRole.guild.id);
    const logChannelId = (settings as any).roleLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = newRole.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;
    const guildIcon = newRole.guild.iconURL({ size: 64 }) ?? undefined;
    const changes: { name: string; value: string; inline: boolean }[] = [];
    if (oldRole.name !== newRole.name)             changes.push({ name: "Name",        value: `\`${oldRole.name}\` → \`${newRole.name}\``,                                      inline: false });
    if (oldRole.hexColor !== newRole.hexColor)     changes.push({ name: "Color",       value: `${oldRole.hexColor} → ${newRole.hexColor}`,                                              inline: true  });
    if (oldRole.hoist !== newRole.hoist)           changes.push({ name: "Hoisted",     value: `${oldRole.hoist ? "yes" : "no"} → ${newRole.hoist ? "yes" : "no"}`,                     inline: true  });
    if (oldRole.mentionable !== newRole.mentionable) changes.push({ name: "Mentionable", value: `${oldRole.mentionable ? "yes" : "no"} → ${newRole.mentionable ? "yes" : "no"}`,       inline: true  });
    if (oldRole.unicodeEmoji !== newRole.unicodeEmoji) changes.push({ name: "Emoji",   value: `${oldRole.unicodeEmoji ?? "none"} → ${newRole.unicodeEmoji ?? "none"}`,                  inline: true  });
    if (!changes.length) return;
    const embed = new EmbedBuilder()
      .setColor(0x000000).setAuthor({ name: "Role Updated", iconURL: guildIcon })
      .setDescription(`Role <@&${newRole.id}> was updated in ${newRole.guild.name}`)
      .addFields(...changes).setTimestamp().setFooter({ text: `Role ID: ${newRole.id}` });
    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
