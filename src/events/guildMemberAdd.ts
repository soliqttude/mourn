import type { Client, GuildMember, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { trackInviteUse } from "../features/invites.js";
import { handleAntiraidJoin } from "../features/antiraid.js";
import { db } from "../db/index.js";
import { welcomeChannels } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseScript } from "../lib/scripting.js";

export const event = {
  name: "guildMemberAdd",
  async execute(client: Client, member: GuildMember) {
    if (member.user.bot) return;
    const settings = await getGuildSettings(member.guild.id);

    await handleAntiraidJoin(member, settings);

    // ── Join Gate: avatar check ───────────────────────────────────────────────
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

    // ── Join Gate: minimum account age ────────────────────────────────────────
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

    // ── Multi-channel welcome (welcomeChannels table, full embed scripting) ────
    const welcomeRows = await db
      .select()
      .from(welcomeChannels)
      .where(eq(welcomeChannels.guildId, member.guild.id));

    for (const row of welcomeRows) {
      const ch = member.guild.channels.cache.get(row.channelId);
      if (!ch?.isTextBased()) continue;

      const { embeds, content, components } = parseScript(row.message, {
        user: member,
        guild: member.guild,
        channel: ch as TextChannel,
        client,
        extra: {
          "{inviter}": inviter?.inviterId ? `<@${inviter.inviterId}>` : "unknown",
          "{invite_code}": inviter?.code ?? "unknown",
        },
      });

      await (ch as TextChannel).send({
        content: content ?? undefined,
        embeds: embeds.length ? embeds : undefined,
        components: components.length ? components : undefined,
        allowedMentions: { users: [member.id] },
      }).catch(() => {});
    }

    // ── Legacy single-channel fallback (settings.welcomeChannel) ─────────────
    if (welcomeRows.length === 0 && settings.welcomeChannel) {
      const ch = member.guild.channels.cache.get(settings.welcomeChannel);
      if (ch?.isTextBased()) {
        const welcome = (settings as any).welcomeMessage
          ? (settings as any).welcomeMessage
              .replace("{user}", `<@${member.id}>`)
              .replace("{server}", member.guild.name)
          : null;

        const embed = brandEmbed({
          description: welcome ?? `welcome to **${member.guild.name}**, <@${member.id}>`,
          thumbnail: member.user.displayAvatarURL({ size: 256 }),
          authorName: member.user.globalName ?? member.user.username,
          authorIcon: member.user.displayAvatarURL({ size: 64 }),
        });

        await (ch as TextChannel).send({
          embeds: [embed],
          allowedMentions: { users: [member.id] },
        }).catch(() => {});
      }
    }

    if (settings.joinLogChannel) {
      const ch = member.guild.channels.cache.get(settings.joinLogChannel);
      if (ch?.isTextBased()) {
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
        const lines = [
          `<@${member.id}> **${member.user.username}** (\`${member.id}\`)`,
          `**account age** — ${accountAge}d`,
          `**has avatar** — ${member.user.avatar ? "yes" : "no"}`,
          `**members** — ${member.guild.memberCount}`,
          inviter ? `**invited by** — <@${inviter.inviterId}> (\`${inviter.code}\`)` : null,
        ].filter(Boolean).join("\n");

        const embed = brandEmbed({
          description: lines,
          thumbnail: member.user.displayAvatarURL({ size: 256 }),
          authorName: "member joined",
          authorIcon: member.user.displayAvatarURL({ size: 64 }),
        });
        embed.setTimestamp();
        await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
      }
    }
  },
};
