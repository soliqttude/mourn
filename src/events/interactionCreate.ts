import {
  type Client,
  type Interaction,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { findCommand, commands } from "../handlers/registry.js";
import { buildSlashContext } from "../lib/contextFactory.js";
import { errorEmbed, brandEmbed, successEmbed } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";
import { checkTier, isBotOwner } from "../lib/permissions.js";
import { handlePanelInteraction } from "../panels/router.js";
import { cleanError } from "../lib/format.js";

async function safeFollowUp(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  payload: Parameters<ButtonInteraction["followUp"]>[0],
) {
  try {
    await interaction.followUp(payload);
  } catch {
    try {
      await (interaction.channel as any)?.send(payload as any);
    } catch { /* ignore */ }
  }
}

export const event = {
  name: "interactionCreate",
  async execute(client: Client, interaction: Interaction) {
    try {
      if (interaction.isChatInputCommand()) return handleSlashCommand(client, interaction);
      if (interaction.isButton()) return handleButton(client, interaction);
      if (interaction.isStringSelectMenu()) return handleSelect(client, interaction);
      if (interaction.isModalSubmit()) return handleModal(client, interaction);
    } catch (err) {
      logger.error({ err }, "interactionCreate error");
    }
  },
};

const SLOW_CATEGORIES = new Set(["moderation", "economy", "levels", "giveaway"]);

async function handleSlashCommand(client: Client, interaction: ChatInputCommandInteraction) {
  const cmd = findCommand(interaction.commandName);
  if (!cmd) return;
  if (cmd.guildOnly !== false && !interaction.guild) {
    return interaction.reply({
      embeds: [errorEmbed("this command must be used in a server.")],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (cmd.ownerOnly && !isBotOwner(interaction.user.id)) {
    return interaction.reply({
      embeds: [errorEmbed("this command is restricted to the bot owner.")],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (interaction.member && cmd.permission && cmd.permission !== "everyone") {
    if (!checkTier(interaction.member as any, cmd.permission)) {
      return interaction.reply({
        embeds: [errorEmbed(`you need the **${cmd.permission}** permission to use this.`)],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (SLOW_CATEGORIES.has(cmd.category)) {
    await interaction.deferReply().catch(() => {});
  }

  const settings = interaction.guild ? await getGuildSettings(interaction.guild.id) : null;
  const prefix = settings?.prefix ?? config.defaultPrefix;
  const ctx = await buildSlashContext(client, interaction, prefix);
  try {
    await cmd.execute(ctx);
  } catch (err) {
    logger.error({ err, cmd: cmd.name }, "slash command error");
    const payload: any = {
      embeds: [errorEmbed(cleanError(err))],
      flags: MessageFlags.Ephemeral,
    };
    try {
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
      else await interaction.reply(payload);
    } catch (replyErr) {
      logger.warn({ replyErr }, "failed to send slash error reply");
    }
  }
}

async function handleButton(client: Client, interaction: ButtonInteraction) {
  const id = interaction.customId;
  if (id.startsWith("help:")) return handleHelpButton(interaction);
  if (id.startsWith("panel:")) return handlePanelInteraction(client, interaction);
  const { handleTicketButton } = await import("../features/tickets.js");
  if (id.startsWith("ticket:")) return handleTicketButton(client, interaction);
  const { handleVMButton } = await import("../features/voicemaster.js");
  if (id.startsWith("vm:")) return handleVMButton(client, interaction);
  if (id === "verify_button") {
    const { handleVerificationButton } = await import("../features/verification.js");
    return handleVerificationButton(client, interaction);
  }
  if (id.startsWith("trivia_")) return handleTriviaButton(interaction);
  if (id === "suggest_up" || id === "suggest_down") return handleSuggestionVote(interaction);
}

async function handleHelpButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split(":");
  const action = parts[1];

  const settings = interaction.guild
    ? await getGuildSettings(interaction.guild.id).catch(() => null)
    : null;
  const prefix = settings?.prefix ?? config.defaultPrefix;

  if (action === "back") {
    const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
    const categories = [...new Set(visibleCmds.map((c) => c.category))].sort();
    const { buildHelpHome } = await import("../commands/utility/help.js");
    const { embed, rows } = buildHelpHome(visibleCmds.length, categories, prefix);
    return interaction.update({ embeds: [embed], components: rows as any[] }).catch(() => {});
  }

  if (action === "cat") {
    const category = parts[2];
    if (!category) return;
    const { buildCategoryEmbed } = await import("../commands/utility/help.js");
    const { embed, row } = buildCategoryEmbed(category, prefix);
    return interaction.update({ embeds: [embed], components: [row as any] }).catch(() => {});
  }
}

async function handleTriviaButton(interaction: ButtonInteraction) {
  const [, chosen, correct, userId] = interaction.customId.split("_");
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "that's not your trivia question.", flags: 64 });
  }
  if (chosen === correct) {
    await interaction.update({ components: [] }).catch(() => {});
    return safeFollowUp(interaction, {
      embeds: [successEmbed(`correct. the answer was **${correct}**.`)],
    });
  } else {
    await interaction.update({ components: [] }).catch(() => {});
    return safeFollowUp(interaction, {
      embeds: [errorEmbed(`wrong. the answer was **${correct}**.`)],
    });
  }
}

async function handleSuggestionVote(interaction: ButtonInteraction) {
  await interaction.deferUpdate().catch(() => {});
  const { db } = await import("../db/index.js");
  const { suggestions } = await import("../db/schema.js");
  const { eq, sql } = await import("drizzle-orm");
  const row = await db.select().from(suggestions).where(eq(suggestions.messageId, interaction.message.id));
  if (!row[0]) return;
  const isUp = interaction.customId === "suggest_up";
  await db.update(suggestions)
    .set(isUp ? { upvotes: sql`${suggestions.upvotes} + 1` } : { downvotes: sql`${suggestions.downvotes} + 1` })
    .where(eq(suggestions.messageId, interaction.message.id));
  const updated = await db.select().from(suggestions).where(eq(suggestions.messageId, interaction.message.id));
  const s = updated[0];
  if (!s) return;
  const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("suggest_up").setLabel(`👍 ${s.upvotes}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("suggest_down").setLabel(`👎 ${s.downvotes}`).setStyle(ButtonStyle.Danger),
  );
  await interaction.message.edit({ components: [newRow as any] }).catch(() => {});
}

async function handleSelect(client: Client, interaction: StringSelectMenuInteraction) {
  if (interaction.customId.startsWith("panel:")) return handlePanelInteraction(client, interaction);
}

async function handleModal(client: Client, interaction: ModalSubmitInteraction) {
  if (interaction.customId.startsWith("panel:")) return handlePanelInteraction(client, interaction);
  const { handleTicketModal } = await import("../features/tickets.js");
  if (interaction.customId.startsWith("ticket:")) return handleTicketModal(client, interaction);
}
