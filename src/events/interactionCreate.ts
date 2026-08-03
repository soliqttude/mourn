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
import { errorEmbed, successEmbed, brandEmbed, getEmbedStyle, EMOJIS } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";
import { checkTier, isBotOwner } from "../lib/permissions.js";
import { ownerState } from "../lib/ownerState.js";
import { isBlacklisted } from "../lib/blacklistCache.js";
import { handlePanelInteraction } from "../panels/router.js";
import { cleanError } from "../lib/format.js";
import { buildHelpHome, buildPagedCategoryEmbed, buildCategoryEmbed } from "../commands/utility/help.js";
import { buildLeaderboardMessage } from "../commands/utility/invites.js";
import { EmbedBuilder } from "discord.js";

// Inject "emoji @user: " into styled embeds — used in button handlers that bypass contextFactory
function applyMention(embeds: EmbedBuilder[], userId: string): EmbedBuilder[] {
  const mention = `<@${userId}>`;
  return embeds.map((eb) => {
    const style = getEmbedStyle(eb);
    if (!style || style === "brand" || style === "mod") return eb;
    const desc = (eb.data as any).description ?? "";
    const emoji =
      style === "success" ? EMOJIS.check :
      style === "error"   ? EMOJIS.warn  :
      style === "warn"    ? EMOJIS.warn  :
      style === "action"  ? EMOJIS.plus  : "";
    eb.setDescription(`${emoji} ${mention}: ${desc}`);
    return eb;
  });
}

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

const SLOW_CATEGORIES = new Set(["moderation", "levels", "giveaway"]);

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

  if (!isBotOwner(interaction.user.id)) {
    const { blacklisted, reason } = await isBlacklisted(interaction.user.id);
    if (blacklisted) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            reason
              ? `you are blacklisted from mourn.\n**reason** — ${reason}`
              : "you are blacklisted from mourn."
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (interaction.guild && ownerState.disabledGuilds.has(interaction.guild.id) && !isBotOwner(interaction.user.id)) {
    return interaction.reply({ embeds: [errorEmbed("the bot is currently disabled in this server.")], flags: MessageFlags.Ephemeral });
  }

  if (interaction.member && cmd.permission && cmd.permission !== "everyone") {
    if (!checkTier(interaction.member as any, cmd.permission)) {
      return interaction.reply({
        embeds: [errorEmbed(`<:warn:1508824473992696049> <@${interaction.user.id}>: You're **missing** permission: \`${cmd.permission}\``)],
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
      embeds: applyMention([errorEmbed(cleanError(err))], interaction.user.id),
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
  if (id.startsWith("invites:")) return handleInvitesButton(interaction);
  if (id.startsWith("panel:")) return handlePanelInteraction(client, interaction);
  const { handleTicketButton } = await import("../features/tickets.js");
  if (id.startsWith("ticket_")) return handleTicketButton(interaction);
  const { handleVMButton } = await import("../features/voicemaster.js");
  if (id.startsWith("vm:")) return handleVMButton(client, interaction);
  if (id === "verify_button") {
    const { handleVerificationButton } = await import("../features/verification.js");
    return handleVerificationButton(client, interaction);
  }
  if (id.startsWith("role:")) return handleRoleButton(interaction);
  if (id.startsWith("trivia_")) return handleTriviaButton(interaction);
  if (id === "suggest_up" || id === "suggest_down") return handleSuggestionVote(interaction);
}

async function handleInvitesButton(interaction: ButtonInteraction) {
  try {
    const parts = interaction.customId.split(":");
    const action = parts[1];
    const currentPage = parseInt(parts[2] ?? "0", 10);
    const guildId = parts[3];
    const requesterId = parts[4];

    if (interaction.user.id !== requesterId) {
      return interaction.reply({
        embeds: applyMention([errorEmbed("this isn't your leaderboard.")], interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
    }

    if (action === "stop") {
      return interaction.update({ components: [] });
    }

    let targetPage = currentPage;
    if (action === "first") targetPage = 0;
    else if (action === "prev") targetPage = currentPage - 1;
    else if (action === "next") targetPage = currentPage + 1;

    if (!guildId) return interaction.deferUpdate();
    await interaction.deferUpdate();
    const { embed, row } = await buildLeaderboardMessage(guildId, targetPage, requesterId);
    return interaction.editReply({ embeds: [embed], components: [row as any] });
  } catch (err) {
    logger.error({ err }, "invites button error");
    try { await interaction.deferUpdate(); } catch { /* already acked */ }
  }
}

async function handleHelpButton(interaction: ButtonInteraction) {
  try {
    const parts = interaction.customId.split(":");
    const action = parts[1];
    const prefix = config.defaultPrefix;
    const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
    const categories = [...new Set(visibleCmds.map((c) => c.category))].sort();

    if (action === "back" || action === "home") {
      const { embed, rows } = buildHelpHome(visibleCmds.length, categories, prefix);
      return await interaction.update({ embeds: [embed], components: rows as any[] });
    }

    if (action === "pg") {
      const catIdx = parseInt(parts[2] ?? "0", 10);
      const cmdPage = parseInt(parts[3] ?? "0", 10);
      const { embed, rows } = buildPagedCategoryEmbed(catIdx, categories, prefix, cmdPage);
      return await interaction.update({ embeds: [embed], components: rows as any[] });
    }

    if (action === "cat") {
      const category = parts[2];
      if (!category) return await interaction.deferUpdate();
      const { embed, rows } = buildCategoryEmbed(category, prefix);
      return await interaction.update({ embeds: [embed], components: rows as any[] });
    }

    await interaction.deferUpdate();
  } catch (err) {
    logger.error({ err }, "help button error");
    try { await interaction.deferUpdate(); } catch { /* already acknowledged */ }
  }
}

async function handleTriviaButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split("_");
  const chosen = parts[1];
  const correct = parts[2];
  const userId = parts[3];

  if (interaction.user.id !== userId) {
    return interaction.reply({
      embeds: applyMention([errorEmbed("that's not your trivia question.")], interaction.user.id),
      flags: MessageFlags.Ephemeral,
    });
  }
  await interaction.update({ components: [] }).catch(() => {});
  if (chosen === correct) {
    return safeFollowUp(interaction, {
      embeds: applyMention(
        [successEmbed(`correct! the answer was **${correct}**.`)],
        interaction.user.id
      ),
    });
  } else {
    return safeFollowUp(interaction, {
      embeds: applyMention(
        [errorEmbed(`wrong. the correct answer was **${correct}**.`)],
        interaction.user.id
      ),
    });
  }
}

async function handleRoleButton(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.member) return;
  const parts = interaction.customId.split(":");
  const roleId = parts[2];
  if (!roleId) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return;
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.editReply({
      embeds: applyMention([errorEmbed("role not found.")], interaction.user.id),
    }).catch(() => {});
  }
  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId).catch(() => {});
    return interaction.editReply({
      embeds: applyMention([successEmbed(`removed **${role.name}**.`)], interaction.user.id),
    }).catch(() => {});
  } else {
    await member.roles.add(roleId).catch(() => {});
    return interaction.editReply({
      embeds: applyMention([successEmbed(`gave you **${role.name}**.`)], interaction.user.id),
    }).catch(() => {});
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
  if (interaction.customId === "help:select") {
    try {
      const category = interaction.values[0];
      if (!category) return interaction.deferUpdate();
      const prefix = config.defaultPrefix;
      const { embed, rows } = buildCategoryEmbed(category, prefix);
      return interaction.update({ embeds: [embed], components: rows as any[] });
    } catch (err) {
      logger.error({ err }, "help select error");
      try { await interaction.deferUpdate(); } catch { /* already acked */ }
    }
  }
}

async function handleModal(client: Client, interaction: ModalSubmitInteraction) {
  if (interaction.customId.startsWith("panel:")) return handlePanelInteraction(client, interaction);
  const { handleTicketModal } = await import("../features/tickets.js");
  if (interaction.customId.startsWith("ticket_close_modal_")) return handleTicketModal(interaction);
}
