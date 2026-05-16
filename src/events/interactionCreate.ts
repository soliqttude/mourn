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
import { isBlacklisted } from "../lib/blacklistCache.js";
import { handlePanelInteraction } from "../panels/router.js";
import { cleanError } from "../lib/format.js";
import { buildHelpHome, buildPagedCategoryEmbed, buildCategoryEmbed } from "../commands/utility/help.js";

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

  if (!isBotOwner(interaction.user.id)) {
    const { blacklisted, reason } = await isBlacklisted(interaction.user.id);
    if (blacklisted) {
      return interaction.reply({
        embeds: [
          new (await import("discord.js")).EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("⛔  You're Blacklisted")
            .setDescription(
              [
                "You have been **blacklisted** from using Bleed and cannot use any commands.",
                "",
                reason ? `**Reason:** ${reason}` : "",
                "",
                "If you believe this is a mistake, contact the developer.",
              ].filter(Boolean).join("\n")
            )
            .setFooter({ text: "Bleed" })
            .setTimestamp(),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
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
  if (id.startsWith("role:")) return handleRoleButton(interaction);
  if (id.startsWith("trivia_")) return handleTriviaButton(interaction);
  if (id === "suggest_up" || id === "suggest_down") return handleSuggestionVote(interaction);
}

function handleHelpButton(interaction: ButtonInteraction) {
  // Fully synchronous — build payload first, then call update() with zero delay.
  // No awaits before update() means we always respond within Discord's 3s window.
  // The prefix is read from the guild settings cache (already populated) or falls
  // back to the default — either way it's a synchronous Map lookup.
  const parts = interaction.customId.split(":");
  const action = parts[1];

  const prefix = config.defaultPrefix;

  const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
  const categories = [...new Set(visibleCmds.map((c) => c.category))].sort();

  if (action === "back" || action === "home") {
    const { embed, rows } = buildHelpHome(visibleCmds.length, categories, prefix);
    return interaction.update({ embeds: [embed], components: rows as any[] });
  }

  if (action === "pg") {
    const catIdx = parseInt(parts[2] ?? "0", 10);
    const cmdPage = parseInt(parts[3] ?? "0", 10);
    const { embed, row } = buildPagedCategoryEmbed(catIdx, categories, prefix, cmdPage);
    return interaction.update({ embeds: [embed], components: [row as any] });
  }

  if (action === "cat") {
    const category = parts[2];
    if (!category) return;
    const { embed, row } = buildCategoryEmbed(category, prefix);
    return interaction.update({ embeds: [embed], components: [row as any] });
  }
}

async function handleTriviaButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split("_");
  const chosen = parts[1];
  const correct = parts[2];
  const userId = parts[3];
  const reward = parseInt(parts[4] ?? "50", 10);
  const guildId = parts[5] ?? interaction.guildId ?? "";

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "that's not your trivia question.", flags: 64 });
  }
  if (chosen === correct) {
    await interaction.update({ components: [] }).catch(() => {});
    if (guildId) {
      const { addBalance } = await import("../features/economy.js");
      await addBalance(guildId, userId, reward).catch(() => {});
    }
    return safeFollowUp(interaction, {
      embeds: [successEmbed(`✅ correct! the answer was **${correct}**. +${reward} coins 🪙`)],
    });
  } else {
    await interaction.update({ components: [] }).catch(() => {});
    return safeFollowUp(interaction, {
      embeds: [errorEmbed(`❌ wrong. the correct answer was **${correct}**.`)],
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
  if (!role) return interaction.editReply({ content: "Role not found." }).catch(() => {});
  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId).catch(() => {});
    return interaction.editReply({ content: `removed **${role.name}**` }).catch(() => {});
  } else {
    await member.roles.add(roleId).catch(() => {});
    return interaction.editReply({ content: `gave you **${role.name}**` }).catch(() => {});
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
