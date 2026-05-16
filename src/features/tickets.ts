import {
  type Client,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
  type Guild,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
} from "discord.js";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { tickets, ticketPanels, guildSettings } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";
import { successEmbed, errorEmbed } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";

export interface TicketTopic {
  name: string;
  emoji?: string;
  description?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ticketNum(n: number): string {
  return String(n).padStart(4, "0");
}

const footer = { text: "bleed · tickets" } as const;

async function incrementCount(guildId: string): Promise<number> {
  await db
    .update(guildSettings)
    .set({ ticketCount: sql`${guildSettings.ticketCount} + 1` })
    .where(eq(guildSettings.guildId, guildId));
  const rows = await db
    .select({ c: guildSettings.ticketCount })
    .from(guildSettings)
    .where(eq(guildSettings.guildId, guildId));
  return rows[0]?.c ?? 1;
}

async function getTicketByChannel(channelId: string) {
  const rows = await db.select().from(tickets).where(eq(tickets.channelId, channelId));
  return rows[0] ?? null;
}

function openRow(claimed: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    claimed
      ? new ButtonBuilder().setCustomId("ticket:unclaim").setLabel("unclaim").setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder().setCustomId("ticket:claim").setLabel("claim").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("close ticket").setStyle(ButtonStyle.Danger),
  );
}

function closedRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:reopen").setLabel("reopen").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:delete").setLabel("delete").setStyle(ButtonStyle.Danger),
  );
}

function mgmtEmbed(num: number, openerId: string, topic?: string | null, reason?: string | null): EmbedBuilder {
  const lines: string[] = [`**opened by** — <@${openerId}>`];
  if (topic) lines.push(`**topic** — ${topic.toLowerCase()}`);
  if (reason) lines.push(`**reason** — ${reason.toLowerCase()}`);
  lines.push(`\nsupport will be with you shortly.`);
  return new EmbedBuilder()
    .setColor(config.brandColor as any)
    .setAuthor({ name: `ticket · #${ticketNum(num)}` })
    .setDescription(lines.join("\n"))
    .setFooter(footer);
}

async function generateTranscript(ch: TextChannel): Promise<AttachmentBuilder> {
  const msgs = await ch.messages.fetch({ limit: 100 });
  const sorted = [...msgs.values()].reverse();
  const lines = sorted.map((m) => {
    const ts = m.createdAt.toISOString().replace("T", " ").slice(0, 19);
    const body = m.content || (m.embeds.length ? "[embed]" : "[attachment]");
    return `[${ts}] ${m.author.tag}: ${body}`;
  });
  const text = [`transcript — #${ch.name}`, `exported ${new Date().toISOString()}`, "─".repeat(60), ...lines].join("\n");
  return new AttachmentBuilder(Buffer.from(text, "utf8"), { name: `transcript-${ch.name}.txt` });
}

async function pushTranscript(
  guild: Guild,
  ticket: typeof tickets.$inferSelect,
  ch: TextChannel,
  actorId: string,
  settings: Awaited<ReturnType<typeof getGuildSettings>>,
): Promise<void> {
  if (!settings.ticketLogChannel) return;
  const logCh = guild.channels.cache.get(settings.ticketLogChannel);
  if (!logCh?.isTextBased()) return;
  try {
    const file = await generateTranscript(ch);
    const embed = new EmbedBuilder()
      .setColor(config.brandColor as any)
      .setAuthor({ name: `ticket closed · #${ticketNum(ticket.number)}` })
      .setDescription(
        [
          `**channel** — ${ch.name}`,
          `**opened by** — <@${ticket.openerId}>`,
          `**closed by** — <@${actorId}>`,
          ticket.topic ? `**topic** — ${ticket.topic.toLowerCase()}` : null,
          ticket.claimerId ? `**claimed by** — <@${ticket.claimerId}>` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .setFooter(footer)
      .setTimestamp();
    await (logCh as TextChannel).send({ embeds: [embed], files: [file] });
  } catch (err) {
    logger.warn({ err }, "failed to send ticket transcript");
  }
}

async function lockCh(ch: TextChannel, openerId: string): Promise<void> {
  await ch.permissionOverwrites.edit(openerId, { SendMessages: false }).catch(() => {});
}

async function unlockCh(ch: TextChannel, openerId: string): Promise<void> {
  await ch.permissionOverwrites.edit(openerId, { SendMessages: true, ViewChannel: true, ReadMessageHistory: true }).catch(() => {});
}

// ── Close / Reopen / Delete internals ─────────────────────────────────────────

async function _close(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket || ticket.status === "closed") return;

  await lockCh(ch, ticket.openerId);
  await db.update(tickets).set({ status: "closed", closedAt: new Date() }).where(eq(tickets.channelId, ch.id));

  if (ticket.managementMessageId) {
    const msg = await ch.messages.fetch(ticket.managementMessageId).catch(() => null);
    if (msg) {
      const e = mgmtEmbed(ticket.number, ticket.openerId, ticket.topic)
        .setColor(0x2b2d31 as any)
        .setAuthor({ name: `ticket closed · #${ticketNum(ticket.number)}` });
      await msg.edit({ embeds: [e], components: [closedRow() as any] }).catch(() => {});
    }
  }

  await ch.send({
    embeds: [new EmbedBuilder().setColor(config.brandColor as any).setDescription(`ticket closed by <@${actorId}>`).setFooter(footer)],
  }).catch(() => {});

  const settings = await getGuildSettings(guild.id);
  await pushTranscript(guild, ticket, ch, actorId, settings);
}

async function _reopen(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket || ticket.status === "open") return;

  await unlockCh(ch, ticket.openerId);
  await db.update(tickets).set({ status: "open", closedAt: null }).where(eq(tickets.channelId, ch.id));

  if (ticket.managementMessageId) {
    const msg = await ch.messages.fetch(ticket.managementMessageId).catch(() => null);
    if (msg) {
      const e = mgmtEmbed(ticket.number, ticket.openerId, ticket.topic);
      await msg.edit({ embeds: [e], components: [openRow(!!ticket.claimerId) as any] }).catch(() => {});
    }
  }

  await ch.send({
    embeds: [new EmbedBuilder().setColor(config.successColor as any).setDescription(`ticket reopened by <@${actorId}>`).setFooter(footer)],
  }).catch(() => {});
}

async function _delete(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket) return;
  const settings = await getGuildSettings(guild.id);
  await pushTranscript(guild, ticket, ch, actorId, settings);
  await db.update(tickets).set({ status: "deleted" }).where(eq(tickets.channelId, ch.id));
  await ch.send({
    embeds: [new EmbedBuilder().setColor(config.errorColor as any).setDescription("deleting ticket...").setFooter(footer)],
  }).catch(() => {});
  setTimeout(() => ch.delete().catch(() => {}), 3_000);
}

// ── Panel creation ─────────────────────────────────────────────────────────────

export async function createTicketPanel(
  channel: TextChannel,
  title: string,
  description: string,
  topics: TicketTopic[] = [],
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(config.brandColor as any)
    .setTitle(title)
    .setDescription(description)
    .setFooter(footer);

  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (topics.length === 0) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("ticket:open").setLabel("open ticket").setEmoji("🎟️").setStyle(ButtonStyle.Primary),
      ),
    );
  } else {
    let row = new ActionRowBuilder<ButtonBuilder>();
    let col = 0;
    for (const t of topics.slice(0, 20)) {
      const btn = new ButtonBuilder()
        .setCustomId(`ticket:open:${encodeURIComponent(t.name)}`)
        .setLabel(t.name.toLowerCase())
        .setStyle(ButtonStyle.Secondary);
      if (t.emoji) btn.setEmoji(t.emoji);
      row.addComponents(btn);
      col++;
      if (col === 5) {
        components.push(row);
        row = new ActionRowBuilder<ButtonBuilder>();
        col = 0;
      }
    }
    if (col > 0) components.push(row);
  }

  const sent = await channel.send({ embeds: [embed], components: components as any[] });
  await db.insert(ticketPanels).values({ guildId: channel.guild.id, channelId: channel.id, messageId: sent.id }).onConflictDoNothing();
}

// ── Button handler ─────────────────────────────────────────────────────────────

export async function handleTicketButton(client: Client, interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;
  const parts = interaction.customId.split(":");
  const action = parts[1];

  if (action === "open") {
    const rawTopic = parts[2] ? decodeURIComponent(parts[2]) : null;
    const modal = new ModalBuilder()
      .setCustomId(rawTopic ? `ticket:create:${encodeURIComponent(rawTopic)}` : "ticket:create")
      .setTitle(rawTopic ? `${rawTopic.toLowerCase()} — open ticket` : "open a ticket");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("what do you need help with?")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(3)
          .setMaxLength(500)
          .setRequired(true),
      ),
    );
    return interaction.showModal(modal);
  }

  if (action === "claim") {
    const ch = interaction.channel as TextChannel;
    const ticket = await getTicketByChannel(ch.id);
    if (!ticket) return;
    await db.update(tickets).set({ claimerId: interaction.user.id }).where(eq(tickets.channelId, ch.id));
    if (ticket.managementMessageId) {
      const msg = await ch.messages.fetch(ticket.managementMessageId).catch(() => null);
      if (msg) await msg.edit({ components: [openRow(true) as any] }).catch(() => {});
    }
    await interaction.reply({ embeds: [successEmbed(`ticket claimed by <@${interaction.user.id}>`)], ephemeral: true });
    return;
  }

  if (action === "unclaim") {
    const ch = interaction.channel as TextChannel;
    const ticket = await getTicketByChannel(ch.id);
    if (!ticket) return;
    if (ticket.claimerId !== interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed("you didn't claim this ticket.")], ephemeral: true });
      return;
    }
    await db.update(tickets).set({ claimerId: null }).where(eq(tickets.channelId, ch.id));
    if (ticket.managementMessageId) {
      const msg = await ch.messages.fetch(ticket.managementMessageId).catch(() => null);
      if (msg) await msg.edit({ components: [openRow(false) as any] }).catch(() => {});
    }
    await interaction.reply({ embeds: [successEmbed(`<@${interaction.user.id}> unclaimed the ticket`)], ephemeral: true });
    return;
  }

  if (action === "close") {
    await interaction.deferUpdate().catch(() => {});
    await _close(interaction.channel as TextChannel, interaction.user.id, interaction.guild);
    return;
  }

  if (action === "reopen") {
    await interaction.deferUpdate().catch(() => {});
    await _reopen(interaction.channel as TextChannel, interaction.user.id, interaction.guild);
    return;
  }

  if (action === "delete") {
    await interaction.deferUpdate().catch(() => {});
    await _delete(interaction.channel as TextChannel, interaction.user.id, interaction.guild);
    return;
  }
}

// ── Modal handler ──────────────────────────────────────────────────────────────

export async function handleTicketModal(client: Client, interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) return;
  if (!interaction.customId.startsWith("ticket:create")) return;

  const rawParts = interaction.customId.split(":");
  const rawTopic = rawParts[2] ? decodeURIComponent(rawParts[2]) : null;
  const reason = interaction.fields.getTextInputValue("reason");
  const settings = await getGuildSettings(interaction.guild.id);
  const num = await incrementCount(interaction.guild.id);

  const everyone = interaction.guild.roles.everyone;
  const overwrites: any[] = [
    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: interaction.client.user!.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];
  if (settings.ticketSupportRole) {
    overwrites.push({
      id: settings.ticketSupportRole,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  const channel = await interaction.guild.channels.create({
    name: `ticket-${ticketNum(num)}`,
    type: ChannelType.GuildText,
    parent: settings.ticketCategory ?? undefined,
    permissionOverwrites: overwrites,
  });

  const embed = mgmtEmbed(num, interaction.user.id, rawTopic, reason);
  const content = settings.ticketSupportRole ? `<@&${settings.ticketSupportRole}>` : undefined;
  const sent = await (channel as TextChannel).send({ content, embeds: [embed], components: [openRow(false) as any] });

  await db.insert(tickets).values({
    guildId: interaction.guild.id,
    channelId: channel.id,
    openerId: interaction.user.id,
    topic: rawTopic ?? undefined,
    number: num,
    managementMessageId: sent.id,
  });

  await interaction.reply({
    embeds: [successEmbed(`ticket opened — <#${channel.id}>`)],
    ephemeral: true,
  });
}

// ── Exported helpers for the /ticket command ───────────────────────────────────

export { getTicketByChannel };

export async function ticketAdd(ch: TextChannel, targetId: string): Promise<void> {
  await ch.permissionOverwrites.edit(targetId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  });
}

export async function ticketRemove(ch: TextChannel, targetId: string): Promise<void> {
  await ch.permissionOverwrites.delete(targetId).catch(() => {});
}

export async function ticketRename(ch: TextChannel, name: string): Promise<void> {
  await ch.setName(name.toLowerCase().replace(/\s+/g, "-").slice(0, 90));
}

export async function closeTicketCmd(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  await _close(ch, actorId, guild);
}

export async function reopenTicketCmd(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  await _reopen(ch, actorId, guild);
}

export async function deleteTicketCmd(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  await _delete(ch, actorId, guild);
}
