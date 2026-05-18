import {
  type Client,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
  type Guild,
  type GuildMember,
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
  MessageFlags,
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

function isStaff(member: GuildMember | null | undefined, supportRoleId: string | null | undefined): boolean {
  if (!member) return false;
  const perms = member.permissions;
  if (perms.has(PermissionFlagsBits.Administrator) || perms.has(PermissionFlagsBits.ManageGuild)) return true;
  if (supportRoleId && member.roles.cache.has(supportRoleId)) return true;
  return false;
}

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

function closedMgmtEmbed(
  num: number,
  openerId: string,
  closedById: string,
  topic?: string | null,
  closeReason?: string | null,
): EmbedBuilder {
  const lines: string[] = [
    `**opened by** — <@${openerId}>`,
    `**closed by** — <@${closedById}>`,
  ];
  if (topic) lines.push(`**topic** — ${topic.toLowerCase()}`);
  if (closeReason) lines.push(`**close reason** — ${closeReason.toLowerCase()}`);
  return new EmbedBuilder()
    .setColor(0x2b2d31 as any)
    .setAuthor({ name: `ticket closed · #${ticketNum(num)}` })
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
  const text = [
    `transcript — #${ch.name}`,
    `exported ${new Date().toISOString()}`,
    "─".repeat(60),
    ...lines,
  ].join("\n");
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

// ── Core action internals ─────────────────────────────────────────────────────
// These handle DB + channel state only — management message editing is done
// by the caller before invoking these, so they never race with interactions.

async function _doClose(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket) throw new Error("no ticket found for this channel");
  if (ticket.status === "closed") throw new Error("ticket is already closed");

  // Remove send/react from opener; keep view so they can read the transcript
  await ch.permissionOverwrites
    .edit(ticket.openerId, { SendMessages: false, AddReactions: false })
    .catch((err) => logger.warn({ err }, "failed to lock opener perms on close"));

  await db
    .update(tickets)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(tickets.channelId, ch.id));

  // Rename so the channel list shows it's closed
  await ch.setName(`closed-${ticketNum(ticket.number)}`).catch(() => {});

  await ch
    .send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.errorColor as any)
          .setDescription(
            `ticket closed by <@${actorId}>.\nuse the buttons above to reopen or delete this ticket.`,
          )
          .setFooter(footer),
      ],
    })
    .catch(() => {});

  const settings = await getGuildSettings(guild.id);
  await pushTranscript(guild, ticket, ch, actorId, settings);
}

async function _doReopen(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket) throw new Error("no ticket found for this channel");
  if (ticket.status === "open") throw new Error("ticket is already open");

  await ch.permissionOverwrites
    .edit(ticket.openerId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      AddReactions: true,
    })
    .catch((err) => logger.warn({ err }, "failed to restore opener perms on reopen"));

  await db
    .update(tickets)
    .set({ status: "open", closedAt: null })
    .where(eq(tickets.channelId, ch.id));

  await ch.setName(`ticket-${ticketNum(ticket.number)}`).catch(() => {});

  await ch
    .send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.successColor as any)
          .setDescription(`ticket reopened by <@${actorId}>.`)
          .setFooter(footer),
      ],
    })
    .catch(() => {});
}

async function _doDelete(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket) return;
  const settings = await getGuildSettings(guild.id);
  await pushTranscript(guild, ticket, ch, actorId, settings);
  await db.update(tickets).set({ status: "deleted" }).where(eq(tickets.channelId, ch.id));
  await ch
    .send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.errorColor as any)
          .setDescription("deleting ticket in 5 seconds...")
          .setFooter(footer),
      ],
    })
    .catch(() => {});
  setTimeout(() => ch.delete().catch(() => {}), 5_000);
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
        new ButtonBuilder()
          .setCustomId("ticket:open")
          .setLabel("open ticket")
          .setEmoji("🎟️")
          .setStyle(ButtonStyle.Primary),
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
  await db
    .insert(ticketPanels)
    .values({ guildId: channel.guild.id, channelId: channel.id, messageId: sent.id })
    .onConflictDoNothing();
}

// ── Button handler ─────────────────────────────────────────────────────────────

export async function handleTicketButton(client: Client, interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const parts = interaction.customId.split(":");
  const action = parts[1];
  const ch = interaction.channel as TextChannel;
  const member = interaction.member as GuildMember;

  // ── open (from panel) ───────────────────────────────────────────────────────
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

  // ── all other actions require a valid ticket ───────────────────────────────
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket) {
    await interaction.reply({
      embeds: [errorEmbed("this channel is not a ticket.")],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = await getGuildSettings(interaction.guild.id);
  const staff = isStaff(member, settings.ticketSupportRole);

  // ── claim ───────────────────────────────────────────────────────────────────
  if (action === "claim") {
    if (!staff) {
      await interaction.reply({
        embeds: [errorEmbed("only support staff can claim tickets.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (ticket.claimerId) {
      await interaction.reply({
        embeds: [errorEmbed(`already claimed by <@${ticket.claimerId}>.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await db.update(tickets).set({ claimerId: interaction.user.id }).where(eq(tickets.channelId, ch.id));
    // update() both acks the button AND updates the message — no race
    await interaction.update({ components: [openRow(true) as any] });
    await ch.send({ embeds: [successEmbed(`ticket claimed by <@${interaction.user.id}>`)] }).catch(() => {});
    return;
  }

  // ── unclaim ─────────────────────────────────────────────────────────────────
  if (action === "unclaim") {
    if (!staff && ticket.claimerId !== interaction.user.id) {
      await interaction.reply({
        embeds: [errorEmbed("only the claimer or support staff can unclaim this ticket.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await db.update(tickets).set({ claimerId: null }).where(eq(tickets.channelId, ch.id));
    await interaction.update({ components: [openRow(false) as any] });
    await ch.send({ embeds: [successEmbed(`<@${interaction.user.id}> unclaimed the ticket`)] }).catch(() => {});
    return;
  }

  // ── close — show reason modal (modal submit handles the actual close) ───────
  if (action === "close") {
    if (!staff && interaction.user.id !== ticket.openerId) {
      await interaction.reply({
        embeds: [errorEmbed("only support staff or the ticket opener can close this ticket.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (ticket.status === "closed") {
      await interaction.reply({
        embeds: [errorEmbed("ticket is already closed.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const modal = new ModalBuilder().setCustomId("ticket:close_reason").setTitle("close ticket");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("reason for closing (optional)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(200)
          .setRequired(false)
          .setPlaceholder("resolved, spam, inactivity..."),
      ),
    );
    return interaction.showModal(modal);
  }

  // ── reopen ──────────────────────────────────────────────────────────────────
  if (action === "reopen") {
    if (!staff) {
      await interaction.reply({
        embeds: [errorEmbed("only support staff can reopen tickets.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (ticket.status === "open") {
      await interaction.reply({
        embeds: [errorEmbed("ticket is already open.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // update() immediately swaps back to open embed + buttons
    const embed = mgmtEmbed(ticket.number, ticket.openerId, ticket.topic);
    await interaction.update({ embeds: [embed as any], components: [openRow(!!ticket.claimerId) as any] });
    await _doReopen(ch, interaction.user.id, interaction.guild).catch((err) => {
      logger.error({ err }, "ticket reopen failed");
    });
    return;
  }

  // ── delete ──────────────────────────────────────────────────────────────────
  if (action === "delete") {
    if (!staff) {
      await interaction.reply({
        embeds: [errorEmbed("only support staff can delete tickets.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // deferUpdate since the channel will be gone — no message to update
    await interaction.deferUpdate().catch(() => {});
    await _doDelete(ch, interaction.user.id, interaction.guild).catch((err) => {
      logger.error({ err }, "ticket delete failed");
    });
    return;
  }
}

// ── Modal handler ──────────────────────────────────────────────────────────────

export async function handleTicketModal(client: Client, interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) return;

  // ── close reason modal ──────────────────────────────────────────────────────
  if (interaction.customId === "ticket:close_reason") {
    const reason = interaction.fields.getTextInputValue("reason").trim() || null;
    const ch = interaction.channel as TextChannel;

    const ticket = await getTicketByChannel(ch.id);
    if (!ticket) {
      await interaction.reply({
        embeds: [errorEmbed("ticket not found.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (ticket.status === "closed") {
      await interaction.reply({
        embeds: [errorEmbed("ticket is already closed.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ModalSubmitInteraction has no update() — ack with an ephemeral defer,
    // then edit the management message directly via REST (bot has the perms).
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = closedMgmtEmbed(ticket.number, ticket.openerId, interaction.user.id, ticket.topic, reason);

    if (ticket.managementMessageId) {
      const msg = await ch.messages.fetch(ticket.managementMessageId).catch(() => null);
      if (msg) {
        await msg
          .edit({ embeds: [embed as any], components: [closedRow() as any] })
          .catch((err) => logger.warn({ err }, "failed to edit management message on close"));
      }
    }

    // Lock channel, rename, send close msg, push transcript
    await _doClose(ch, interaction.user.id, interaction.guild).catch((err) => {
      logger.error({ err }, "ticket close failed after modal submit");
    });

    // Delete the silent ephemeral ack so no noise
    await interaction.deleteReply().catch(() => {});
    return;
  }

  // ── ticket create modal ─────────────────────────────────────────────────────
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
        PermissionFlagsBits.AddReactions,
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
        PermissionFlagsBits.AttachFiles,
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
        PermissionFlagsBits.AddReactions,
      ],
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${ticketNum(num)}`,
      type: ChannelType.GuildText,
      parent: settings.ticketCategory ?? undefined,
      permissionOverwrites: overwrites,
    });

    const embed = mgmtEmbed(num, interaction.user.id, rawTopic, reason);
    const content = settings.ticketSupportRole ? `<@&${settings.ticketSupportRole}>` : undefined;
    const sent = await (channel as TextChannel).send({
      content,
      embeds: [embed],
      components: [openRow(false) as any],
    });

    await db.insert(tickets).values({
      guildId: interaction.guild.id,
      channelId: channel.id,
      openerId: interaction.user.id,
      topic: rawTopic ?? undefined,
      number: num,
      managementMessageId: sent.id,
    });

    await interaction.editReply({
      embeds: [successEmbed(`ticket opened — <#${channel.id}>`)],
    });
  } catch (err) {
    logger.error({ err }, "failed to create ticket");
    await interaction.editReply({
      embeds: [errorEmbed("failed to create ticket. please check the bot's channel permissions.")],
    }).catch(() => {});
  }
}

// ── Exported helpers for the /ticket slash command ────────────────────────────

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
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket) return;
  const embed = closedMgmtEmbed(ticket.number, ticket.openerId, actorId, ticket.topic);
  if (ticket.managementMessageId) {
    const msg = await ch.messages.fetch(ticket.managementMessageId).catch(() => null);
    if (msg) await msg.edit({ embeds: [embed as any], components: [closedRow() as any] }).catch(() => {});
  }
  await _doClose(ch, actorId, guild);
}

export async function reopenTicketCmd(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  const ticket = await getTicketByChannel(ch.id);
  if (!ticket) return;
  const embed = mgmtEmbed(ticket.number, ticket.openerId, ticket.topic);
  if (ticket.managementMessageId) {
    const msg = await ch.messages.fetch(ticket.managementMessageId).catch(() => null);
    if (msg) await msg.edit({ embeds: [embed as any], components: [openRow(!!ticket.claimerId) as any] }).catch(() => {});
  }
  await _doReopen(ch, actorId, guild);
}

export async function deleteTicketCmd(ch: TextChannel, actorId: string, guild: Guild): Promise<void> {
  await _doDelete(ch, actorId, guild);
}
