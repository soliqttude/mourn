import type { Client, GuildBan, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "guildBanAdd",
  async execute(client: Client, ban: GuildBan) {
    await handleAntinukeAction(client, ban.guild, "ban_add", ban.user.id).catch(() => {});

    const settings = await getGuildSettings(ban.guild.id);
    if (!settings.modLogChannel) return;
    const ch = ban.guild.channels.cache.get(settings.modLogChannel);
    if (!ch?.isTextBased()) return;

    const created   = Math.floor(ban.user.createdTimestamp / 1000);
    const avatarURL = ban.user.displayAvatarURL({ size: 256 });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "Member Banned", iconURL: avatarURL })
      .setThumbnail(avatarURL)
      .setDescription(`<@${ban.user.id}> was banned from ${ban.guild.name}`)
      .addFields(
        { name: "Reason",          value: ban.reason?.toLowerCase() ?? "no reason provided", inline: false },
        { name: "Account Created", value: `<t:${created}:R>`,                                inline: true  },
      )
      .setTimestamp()
      .setFooter({ text: `User ID: ${ban.user.id}` });

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
