import {
  ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, type Guild, type GuildMember, type TextChannel, type ButtonInteraction,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} from "discord.js";
import { db } from "../db/index.js";
import { tickets, ticketForms, ticketPanels, guildSettings } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface TicketTopic {
  name: string;
  emoji?: string;
  description?: string;
}

// ── Swap these out for custom server emojis once you have them ─────────────────
const E = {
  bug:        "<:warn:1515113428749123674>",   // search: wrench / tool
  suggestion: "<:idea:1515113444540682321>",   // search: sparkle / star
  support:    "<:emoji_25:1515113714599067658>",   // search: mail / ticket / envelope
};

const DEFAULT_TOPICS: TicketTopic[] = [
  { name: "bug report",  emoji: E.bug,        description: "something's broken? let us know." },
  { name: "suggestion",  emoji: E.suggestion, description: "got an idea? drop it here."        },
  { name: "support",     emoji: E.support,    description: "need help? we've got you."         },
];

const BUTTON_STYLES: Record<string, ButtonStyle> = {
  "bug report": ButtonStyle.Secondary,
  "suggestion": ButtonStyle.Secondary,
  "support":    ButtonStyle.Secondary,
};

export async function createTicketPanel(
  channel: TextChannel,
  title: string,
  description: string,
  topics: TicketTopic[] = [],
): Promise<void> {
  const resolved = topics.length > 0 ? topics : DEFAULT_TOPICS;

  const topicLines = resolved
    .map((t) => `${t.emoji ?? "📩"} **${t.name}** — ${t.description ?? ""}`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(0x000000)
    .setAuthor({
      name:    title.toLowerCase(),
      iconURL: channel.guild.iconURL({ size: 128 }) ?? undefined,
    })
    .setDescription(
      [
        description,
        "",
        topicLines,
      ].join("\n"),
    )
    .setFooter({
      text: `${channel.guild.name} • select a category below to open a ticket`,
      iconURL: channel.guild.iconURL({ size: 32 }) ?? undefined,
    });

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const chunks: TicketTopic[][] = [];
  for (let i = 0; i < Math.min(resolved.length, 25); i += 5) {
    chunks.push(resolved.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...chunk.map((t) =>
        new ButtonBuilder()
          .setCustomId(`ticket_open_${t.name}`)
          .setLabel(t.name)
          .setStyle(BUTTON_STYLES[t.name.toLowerCase()] ?? ButtonStyle.Secondary)
          .setEmoji(t.emoji ?? "📩"),
      ),
    );
    rows.push(row);
  }

  const msg = await channel.send({ embeds: [embed], components: rows });

  await db
    .insert(ticketPanels)
    .values({ guildId: channel.guild.id, messageId: msg.id, channelId: channel.id })
    .onConflictDoNothing();
}

export async function createTicket(guild: Guild, member: GuildMember, topic?: string): Promise<TextChannel | null> {
  const settings = await getGuildSettings(guild.id);
  if (!settings.ticketCategory) return null;

  const category = guild.channels.cache.get(settings.ticketCategory);
  if (!category) return null;

  const ticketCount = (settings.ticketCount ?? 0) + 1;
  await db.update(guildSettings).set({ ticketCount }).where(eq(guildSettings.guildId, guild.id));

  const template = settings.ticketNamingTemplate ?? "ticket-{number}";
  const channelName = template
    .replace("{number}", String(ticketCount).padStart(4, "0"))
    .replace("{user}", member.user.username.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .replace("{topic}", (topic ?? "general").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20))
    .slice(0, 100);

  const overwrites: any[] = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
    { id: guild.client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
  ];

  if (settings.ticketSupportRole) {
    overwrites.push({ id: settings.ticketSupportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages] });
  }
  if (settings.ticketTraineeRole) {
    overwrites.push({ id: settings.ticketTraineeRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: settings.ticketCategory,
    permissionOverwrites: overwrites,
    reason: `ticket #${ticketCount} — ${member.user.tag}`,
  }) as TextChannel;

  const [ticket] = await db.insert(tickets).values({
    guildId: guild.id,
    channelId: channel.id,
    openerId: member.id,
    number: ticketCount,
    topic: topic ?? null,
    status: "open",
    lastActivityAt: new Date(),
  }).returning();

  const topicLabel = topic ?? "support";
  const topicEmoji =
    topicLabel === "bug report" ? E.bug :
    topicLabel === "suggestion" ? E.suggestion : E.support;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim_${ticket.id}`).setLabel("claim").setStyle(ButtonStyle.Primary).setEmoji("🙋"),
    new ButtonBuilder().setCustomId(`ticket_close_${ticket.id}`).setLabel("close").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
    new ButtonBuilder().setCustomId(`ticket_transcript_${ticket.id}`).setLabel("transcript").setStyle(ButtonStyle.Secondary).setEmoji("📄"),
  );

  const embed = new EmbedBuilder()
    .setColor(0x000000)
    .setAuthor({
      name:    `${topicLabel} — ticket #${String(ticketCount).padStart(4, "0")}`,
      iconURL: guild.iconURL({ size: 64 }) ?? undefined,
    })
    .setDescription(
      [
        `opened by <@${member.id}>`,
        "",
        "our team will be with you shortly.",
        "describe your issue in as much detail as possible.",
      ].join("\n"),
    )
    .setFooter({ text: "use the buttons below to manage this ticket." })
    .setTimestamp();

  const mgmtMsg = await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });
  await db.update(tickets).set({ managementMessageId: mgmtMsg.id }).where(eq(tickets.id, ticket.id));

  logger.info({ guild: guild.id, channel: channel.id, ticket: ticket.id, opener: member.id }, "ticket created");
  return channel;
}

export async function closeTicket(
  ticketId: number,
  guild: Guild,
  closerId: string,
  reason?: string,
): Promise<void> {
  const [ticket] = await db.select().from(tickets).where(and(eq(tickets.id, ticketId), eq(tickets.guildId, guild.id)));
  if (!ticket || ticket.status === "closed") return;

  await db.update(tickets).set({
    status: "closed",
    closedAt: new Date(),
    closeReason: reason ?? null,
  }).where(eq(tickets.id, ticketId));

  const ch = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
  if (!ch) return;

  const closeEmbed = new EmbedBuilder()
    .setColor(0xed4245)
    .setDescription([
      `🔒 ticket closed by <@${closerId}>`,
      reason ? `> reason — ${reason}` : null,
    ].filter(Boolean).join("\n"))
    .setTimestamp();
  await ch.send({ embeds: [closeEmbed] }).catch(() => {});

  const settings = await getGuildSettings(guild.id);
  if (settings.ticketLogChannel) {
    const logCh = guild.channels.cache.get(settings.ticketLogChannel) as TextChannel | undefined;
    if (logCh?.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setAuthor({ name: `ticket #${String(ticket.number).padStart(4, "0")} closed` })
        .setDescription([
          `opened by <@${ticket.openerId}>`,
          `closed by <@${closerId}>`,
          ticket.topic ? `topic — ${ticket.topic}` : null,
          reason ? `reason — ${reason}` : null,
        ].filter(Boolean).join("\n"))
        .setTimestamp();
      await logCh.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  await ch.setName(`closed-${ch.name}`.slice(0, 100), "ticket closed").catch(() => {});
  await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {});

  setTimeout(() => {
    ch.delete("ticket closed — auto cleanup").catch(() => {});
  }, 5 * 60 * 1000);
}

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  const { customId, guild, member, user } = interaction;
  if (!guild || !member) return;

  if (customId.startsWith("ticket_claim_")) {
    const ticketId = parseInt(customId.replace("ticket_claim_", ""));
    const settings = await getGuildSettings(guild.id);
    const gMember = member as GuildMember;
    const isSupportOrAbove =
      (settings.ticketSupportRole && gMember.roles.cache.has(settings.ticketSupportRole)) ||
      gMember.permissions.has(PermissionFlagsBits.ManageChannels);
    if (!isSupportOrAbove) {
      return void interaction.reply({ content: "only support staff can claim tickets.", ephemeral: true });
    }
    await db.update(tickets).set({ claimerId: user.id }).where(eq(tickets.id, ticketId));
    await interaction.reply({ content: `🙋 ticket claimed by <@${user.id}>`, allowedMentions: { parse: [] } });
    return;
  }

  if (customId.startsWith("ticket_close_")) {
    const ticketId = parseInt(customId.replace("ticket_close_", ""));
    const modal = new ModalBuilder()
      .setCustomId(`ticket_close_modal_${ticketId}`)
      .setTitle("close ticket");
    const reasonInput = new TextInputBuilder()
      .setCustomId("close_reason")
      .setLabel("reason (optional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(512);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
    await interaction.showModal(modal);
    return;
  }

  if (customId.startsWith("ticket_transcript_")) {
    await interaction.reply({ content: "📄 transcript coming soon.", ephemeral: true });
    return;
  }

  if (customId.startsWith("ticket_open_")) {
    const topic = customId.replace("ticket_open_", "") || undefined;
    const gMember = member as GuildMember;
    const ch = await createTicket(guild, gMember, topic);
    if (!ch) return void interaction.reply({ content: "couldn't create ticket — make sure a ticket category is set.", ephemeral: true });
    return void interaction.reply({ content: `your ticket has been opened — <#${ch.id}>`, ephemeral: true });
  }
}

export async function handleTicketModal(interaction: any): Promise<void> {
  const { customId, guild, user } = interaction;
  if (!guild) return;

  if (customId.startsWith("ticket_close_modal_")) {
    const ticketId = parseInt(customId.replace("ticket_close_modal_", ""));
    const reason = interaction.fields?.getTextInputValue("close_reason") || undefined;
    await interaction.deferReply({ ephemeral: true });
    await closeTicket(ticketId, guild, user.id, reason);
    await interaction.editReply({ content: "ticket closed." }).catch(() => {});
    return;
  }
}

export async function getTicketByChannel(channelId: string) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.channelId, channelId));
  return ticket ?? null;
}

export async function ticketAdd(channel: TextChannel, userId: string): Promise<void> {
  await channel.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    SendMessages: true,
    AttachFiles: true,
  });
}

export async function ticketRemove(channel: TextChannel, userId: string): Promise<void> {
  await channel.permissionOverwrites.delete(userId);
}

export async function ticketRename(channel: TextChannel, name: string): Promise<void> {
  await channel.setName(name.toLowerCase().replace(/\s+/g, "-").slice(0, 100));
}

export async function closeTicketCmd(channel: TextChannel, closerId: string, guild: Guild): Promise<void> {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.channelId, channel.id));
  if (!ticket) return;
  await closeTicket(ticket.id, guild, closerId);
}

export async function reopenTicketCmd(channel: TextChannel, openerId: string, guild: Guild): Promise<void> {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.channelId, channel.id));
  if (!ticket) return;

  await db.update(tickets).set({ status: "open", closedAt: null, closeReason: null }).where(eq(tickets.id, ticket.id));

  const newName = channel.name.replace(/^closed-/, "").slice(0, 100);
  await channel.setName(newName, "ticket reopened").catch(() => {});
  await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setDescription(`🔓 ticket reopened by <@${openerId}>`)
    .setTimestamp();
  await channel.send({ embeds: [embed] }).catch(() => {});
}

export async function deleteTicketCmd(channel: TextChannel, deleterId: string, guild: Guild): Promise<void> {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.channelId, channel.id));
  if (!ticket) return;

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (messages) {
    const lines = [...messages.values()]
      .reverse()
      .map((m) => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`);
    const transcript = lines.join("\n");

    const settings = await getGuildSettings(guild.id);
    if (settings.ticketLogChannel) {
      const logCh = guild.channels.cache.get(settings.ticketLogChannel) as TextChannel | undefined;
      if (logCh?.isTextBased()) {
        const { AttachmentBuilder } = await import("discord.js");
        const buf = Buffer.from(transcript, "utf-8");
        const attachment = new AttachmentBuilder(buf, { name: `ticket-${ticket.number}-transcript.txt` });
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setAuthor({ name: `ticket #${String(ticket.number).padStart(4, "0")} — transcript` })
          .setDescription(`deleted by <@${deleterId}> • opened by <@${ticket.openerId}>`)
          .setTimestamp();
        await logCh.send({ embeds: [embed], files: [attachment] }).catch(() => {});
      }
    }
  }

  await db.delete(tickets).where(eq(tickets.id, ticket.id));
  await channel.delete("ticket deleted").catch(() => {});
}

const inactivityTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function resetInactivityTimer(channelId: string, guildId: string, inactivityHours: number): void {
  const existing = inactivityTimers.get(channelId);
  if (existing) clearTimeout(existing);
  const ms = inactivityHours * 60 * 60 * 1000;
  const timer = setTimeout(async () => {
    inactivityTimers.delete(channelId);
    const [ticket] = await db.select().from(tickets).where(and(eq(tickets.channelId, channelId), eq(tickets.status, "open")));
    if (!ticket) return;
    await db.update(tickets).set({ lastActivityAt: new Date() }).where(eq(tickets.id, ticket.id));
    logger.info({ channelId, guildId, ticket: ticket.id }, "ticket inactivity warning due");
  }, ms);
  inactivityTimers.set(channelId, timer);
}

export function clearInactivityTimer(channelId: string): void {
  const t = inactivityTimers.get(channelId);
  if (t) { clearTimeout(t); inactivityTimers.delete(channelId); }
}
