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
    reason: `Ticket #${ticketCount} — ${member.user.tag}`,
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

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim_${ticket.id}`).setLabel("Claim").setStyle(ButtonStyle.Primary).setEmoji("🙋"),
    new ButtonBuilder().setCustomId(`ticket_close_${ticket.id}`).setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
    new ButtonBuilder().setCustomId(`ticket_transcript_${ticket.id}`).setLabel("Transcript").setStyle(ButtonStyle.Secondary).setEmoji("📄"),
  );

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: `ticket #${String(ticketCount).padStart(4, "0")}` })
    .setDescription(
      [
        `> **opened by** <@${member.id}>`,
        topic ? `> **topic** ${topic}` : null,
        "",
        "Support will be with you shortly.",
        "Use the buttons below to manage this ticket.",
      ].filter(Boolean).join("\n"),
    )
    .setTimestamp();

  const mgmtMsg = await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });
  await db.update(tickets).set({ managementMessageId: mgmtMsg.id }).where(eq(tickets.id, ticket.id));

  // Check for form fields
  const forms = await db.select().from(ticketForms).where(
    and(eq(ticketForms.guildId, guild.id), topic ? eq(ticketForms.topic, topic) : eq(ticketForms.topic, ""))
  );
  if (!forms.length) {
    // try generic form (no topic)
  }

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
      `🔒 **ticket closed** by <@${closerId}>`,
      reason ? `> **reason** ${reason}` : null,
    ].filter(Boolean).join("\n"))
    .setTimestamp();
  await ch.send({ embeds: [closeEmbed] }).catch(() => {});

  // Log to ticket log channel
  const settings = await getGuildSettings(guild.id);
  if (settings.ticketLogChannel) {
    const logCh = guild.channels.cache.get(settings.ticketLogChannel) as TextChannel | undefined;
    if (logCh?.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setAuthor({ name: `ticket #${String(ticket.number).padStart(4, "0")} closed` })
        .setDescription([
          `**opened by** <@${ticket.openerId}>`,
          `**closed by** <@${closerId}>`,
          ticket.topic ? `**topic** ${ticket.topic}` : null,
          reason ? `**reason** ${reason}` : null,
        ].filter(Boolean).join("\n"))
        .setTimestamp();
      await logCh.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  // Archive: rename + lock
  await ch.setName(`closed-${ch.name}`.slice(0, 100), "ticket closed").catch(() => {});
  await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {});

  // Auto-delete after 5 minutes
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
    // Show reason modal
    const modal = new ModalBuilder()
      .setCustomId(`ticket_close_modal_${ticketId}`)
      .setTitle("Close Ticket");
    const reasonInput = new TextInputBuilder()
      .setCustomId("close_reason")
      .setLabel("Reason (optional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(512);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
    await interaction.showModal(modal);
    return;
  }

  if (customId.startsWith("ticket_transcript_")) {
    await interaction.reply({ content: "📄 transcript generation is coming soon.", ephemeral: true });
    return;
  }

  // Panel open ticket button
  if (customId.startsWith("ticket_open_")) {
    const topic = customId.replace("ticket_open_", "") || undefined;
    const gMember = member as GuildMember;
    const ch = await createTicket(guild, gMember, topic);
    if (!ch) return void interaction.reply({ content: "could not create ticket — check category settings.", ephemeral: true });
    return void interaction.reply({ content: `📩 your ticket has been created: <#${ch.id}>`, ephemeral: true });
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

// Inactivity monitoring
const inactivityTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function resetInactivityTimer(channelId: string, guildId: string, inactivityHours: number): void {
  const existing = inactivityTimers.get(channelId);
  if (existing) clearTimeout(existing);
  const ms = inactivityHours * 60 * 60 * 1000;
  const timer = setTimeout(async () => {
    inactivityTimers.delete(channelId);
    const [ticket] = await db.select().from(tickets).where(and(eq(tickets.channelId, channelId), eq(tickets.status, "open")));
    if (!ticket) return;
    const { Client } = await import("discord.js");
    // We don't have easy client access here — mark via db and let the inactivity cron handle it
    await db.update(tickets).set({ lastActivityAt: new Date() }).where(eq(tickets.id, ticket.id));
    logger.info({ channelId, guildId, ticket: ticket.id }, "ticket inactivity warning due");
  }, ms);
  inactivityTimers.set(channelId, timer);
}

export function clearInactivityTimer(channelId: string): void {
  const t = inactivityTimers.get(channelId);
  if (t) { clearTimeout(t); inactivityTimers.delete(channelId); }
}
