import type { Client, GuildMember, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { trackInviteUse } from "../features/invites.js";
import { handleAntiraidJoin } from "../features/antiraid.js";
import { handleBotAdd } from "../features/antinuke.js";
import { db } from "../db/index.js";
import { welcomeChannels } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseScript } from "../lib/scripting.js";
import { brandEmbed } from "../lib/embeds.js";

export const event = {
  name: "guildMemberAdd",
  async execute(client: Client, member: GuildMember) {
    if (member.user.bot) {
      await handleBotAdd(client, member.guild, member).catch(() => {});
      return;
    }

    const settings = await getGuildSettings(member.guild.id);

    await handleAntiraidJoin(member, settings);

    const avatarCheck = (settings as any).antiraidAvatarCheck ?? false;
    if (avatarCheck && !member.user.avatar) {
      const action = (settings as any).antiraidAction ?? "kick";
      const reason = "join gate: no avatar";
      if (action === "ban") await member.ban({ reason }).catch(() => {});
      else await member.kick(reason).catch(() => {});
      const logCh = (settings as any).antiraidLogChannel ? member.guild.channels.cache.get((settings as any).antiraidLogChannel) : null;
      if (logCh?.isTextBased()) {
        await (logCh as TextChannel).send({
          embeds: [brandEmbed({ description: `⛔ **${member.user.username}** was ${action}ned — no avatar (join gate).` })],
        }).catch(() => {});
      }
      return;
    }

    const minAge = (settings as any).antiraidMinAge ?? 0;
    if (minAge > 0) {
      const accountAgeDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
      if (accountAgeDays < minAge) {
        const action = (settings as any).antiraidAction ?? "kick";
        const reason = `join gate: account too new (${Math.floor(accountAgeDays)}d < ${minAge}d required)`;
        if (action === "ban") await member.ban({ reason }).catch(() => {});
        else await member.kick(reason).catch(() => {});
        const logCh = (settings as any).antiraidLogChannel ? member.guild.channels.cache.get((settings as any).antiraidLogChannel) : null;
        if (logCh?.isTextBased()) {
          await (logCh as TextChannel).send({
            embeds: [brandEmbed({ description: `⛔ **${member.user.username}** was ${action}ned — account only ${Math.floor(accountAgeDays)} days old (minimum: ${minAge}d).` })],
          }).catch(() => {});
        }
        return;
      }
    }

    const inviter = await trackInviteUse(member);

    const welcomeRows = await db.select().from(welcomeChannels).where(eq(welcomeChannels.guildId, member.guild.id));
    for (const row of welcomeRows) {
      const ch = member.guild.channels.cache.get(row.channelId);
      if (!ch?.isTextBased()) continue;
      const { embeds, content, components } = parseScript(row.message, {
        user: member, guild: member.guild, channel: ch as TextChannel, client,
        extra: {
          "{inviter}":      inviter?.inviterId ? `<@${inviter.inviterId}>` : "unknown",
          "{invite_code}":  inviter?.code ?? "unknown",
        },
      });
      await (ch as TextChannel).send({
        content:    content ?? undefined,
        embeds:     embeds.length ? embeds : undefined,
        components: components.length ? components : undefined,
        allowedMentions: { users: [member.id] },
      }).catch(() => {});
    }

    if (welcomeRows.length === 0 && settings.welcomeChannel) {
      const ch = member.guild.channels.cache.get(settings.welcomeChannel);
      if (ch?.isTextBased()) {
        const welcome = (settings as any).welcomeMessage
          ? (settings as any).welcomeMessage.replace("{user}", `<@${member.id}>`).replace("{server}", member.guild.name)
          : null;
        const embed = brandEmbed({
          description:  welcome ?? `welcome to **${member.guild.name}**, <@${member.id}>`,
          thumbnail:    member.user.displayAvatarURL({ size: 256 }),
          authorName:   member.user.globalName ?? member.user.username,
          authorIcon:   member.user.displayAvatarURL({ size: 64 }),
        });
        await (ch as TextChannel).send({ embeds: [embed], allowedMentions: { users: [member.id] } }).catch(() => {});
      }
    }

    if (!settings.joinLogChannel) return;
    const logCh = member.guild.channels.cache.get(settings.joinLogChannel);
    if (!logCh?.isTextBased()) return;

    const avatarURL      = member.user.displayAvatarURL({ size: 256 });
    const created        = Math.floor(member.user.createdTimestamp / 1000);
    const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
    const isNew          = accountAgeDays < 7;

    const descLines = [
      `<@${member.id}> joined the server`,
      `Account created <t:${created}:R>`,
    ];
    if (inviter) descLines.push(`Invited by <@${inviter.inviterId}> (code: \`${inviter.code}\`)`);
    if (isNew)   descLines.push(`⚠️ Account is only ${accountAgeDays} day${accountAgeDays === 1 ? "" : "s"} old`);

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "Member Joined", iconURL: avatarURL })
      .setThumbnail(avatarURL)
      .setDescription(descLines.join("\n"))
      .addFields({ name: "Member Count", value: `${member.guild.memberCount}`, inline: true })
      .setTimestamp()
      .setFooter({ text: `User ID: ${member.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
