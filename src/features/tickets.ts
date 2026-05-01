import {
  type Client,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { tickets, ticketPanels } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";

export async function createTicketPanel(
  channel: TextChannel,
  title: string,
  description: string
) {
  const embed = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "Mourn • Tickets" });
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:open")
      .setLabel("Open Ticket")
      .setEmoji("🎟️")
      .setStyle(ButtonStyle.Primary)
  );
  const sent = await channel.send({ embeds: [embed], components: [buttons] });
  await db
    .insert(ticketPanels)
    .values({ guildId: channel.guild.id, channelId: channel.id, messageId: sent.id });
  return sent;
}

export async function handleTicketButton(
  client: Client,
  interaction: ButtonInteraction
) {
  const action = interaction.customId.split(":")[1];
  if (!interaction.guild) return;

  if (action === "open") {
    const modal = new ModalBuilder()
      .setCustomId("ticket:create")
      .setTitle("Open a Ticket");
    const reason = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Reason for opening this ticket")
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(3)
      .setMaxLength(500)
      .setRequired(true);
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(reason)
    );
    return interaction.showModal(modal);
  }

  if (action === "close") {
    const ch = interaction.channel as TextChannel | null;
    if (!ch) return;
    const rows = await db
      .select()
      .from(tickets)
      .where(eq(tickets.channelId, ch.id));
    if (!rows[0]) return;
    await db
      .update(tickets)
      .set({ status: "closed", closedAt: new Date() })
      .where(eq(tickets.channelId, ch.id));
    await interaction.reply({
      content: `🔒 Ticket closed by <@${interaction.user.id}>. Channel will be deleted in 10s.`,
    });
    setTimeout(() => ch.delete().catch(() => {}), 10_000);
    const settings = await getGuildSettings(interaction.guild.id);
    if (settings.ticketLogChannel) {
      const log = interaction.guild.channels.cache.get(settings.ticketLogChannel);
      if (log?.isTextBased()) {
        await (log as TextChannel)
          .send({
            embeds: [
              new EmbedBuilder()
                .setColor(config.brandColor)
                .setTitle("🎟️ Ticket Closed")
                .setDescription(
                  `**Channel:** ${ch.name}\n**Opener:** <@${rows[0].openerId}>\n**Closed by:** <@${interaction.user.id}>`
                )
                .setTimestamp(),
            ],
          })
          .catch(() => {});
      }
    }
    return;
  }

  if (action === "claim") {
    const ch = interaction.channel as TextChannel | null;
    if (!ch) return;
    await db
      .update(tickets)
      .set({ claimerId: interaction.user.id })
      .where(eq(tickets.channelId, ch.id));
    return interaction.reply({
      content: `🤝 Ticket claimed by <@${interaction.user.id}>.`,
    });
  }
}

export async function handleTicketModal(
  client: Client,
  interaction: ModalSubmitInteraction
) {
  if (!interaction.guild) return;
  if (interaction.customId !== "ticket:create") return;
  const reason = interaction.fields.getTextInputValue("reason");
  const settings = await getGuildSettings(interaction.guild.id);
  const everyone = interaction.guild.roles.everyone;
  const overwrites: any[] = [
    { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: interaction.client.user!.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
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
      ],
    });
  }
  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: settings.ticketCategory ?? undefined,
    permissionOverwrites: overwrites,
  });
  await db.insert(tickets).values({
    guildId: interaction.guild.id,
    channelId: channel.id,
    openerId: interaction.user.id,
  });

  const embed = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle("🎟️ Ticket Opened")
    .setDescription(
      `Hello <@${interaction.user.id}>, support will be with you shortly.\n\n**Reason:**\n${reason}`
    )
    .setFooter({ text: "Mourn • Tickets" });

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:claim")
      .setLabel("Claim")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: settings.ticketSupportRole
      ? `<@&${settings.ticketSupportRole}>`
      : undefined,
    embeds: [embed],
    components: [buttons],
  });
  await interaction.reply({
    content: `✅ Ticket created: <#${channel.id}>`,
    ephemeral: true,
  });
}
