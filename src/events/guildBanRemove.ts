import type { Client, GuildBan, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "guildBanRemove",
  async execute(_client: Client, ban: GuildBan) {
    const settings = await getGuildSettings(ban.guild.id);
    if (!settings.modLogChannel) return;
    const ch = ban.guild.channels.cache.get(settings.modLogChannel);
    if (!ch?.isTextBased()) return;

    const created = Math.floor(ban.user.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setAuthor({
        name: `${ban.user.username} unbanned`,
        iconURL: ban.user.displayAvatarURL({ size: 64 }),
      })
      .setThumbnail(ban.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "user",    value: `<@${ban.user.id}> \`${ban.user.id}\``, inline: false },
        { name: "account created", value: `<t:${created}:R>`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `user id: ${ban.user.id}` });

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
