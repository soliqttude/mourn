import type { Client, Role, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "roleCreate",
  async execute(client: Client, role: Role) {
    await handleAntinukeAction(client, role.guild, "role_create", role.id);

    const settings = await getGuildSettings(role.guild.id);
    const logChannelId = (settings as any).roleLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = role.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    const guildIcon = role.guild.iconURL({ size: 256 });

    const embed = new EmbedBuilder()
      .setColor(role.color || 0x9b59b6)
      .setAuthor({ name: "role created", iconURL: guildIcon ?? undefined })
      .setThumbnail(guildIcon)
      .addFields(
        { name: "name",        value: `<@&${role.id}> \`${role.name}\``,  inline: false },
        { name: "color",       value: role.hexColor,                       inline: true  },
        { name: "hoisted",     value: role.hoist ? "yes" : "no",          inline: true  },
        { name: "mentionable", value: role.mentionable ? "yes" : "no",    inline: true  },
        { name: "position",    value: `${role.position}`,                  inline: true  },
        { name: "members",     value: `${role.members.size}`,              inline: true  },
      )
      .setTimestamp()
      .setFooter({ text: `role id: ${role.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
