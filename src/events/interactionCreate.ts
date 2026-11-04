import {
  type Client,
  type Interaction,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { findCommand, commands } from "../handlers/registry.js";
import { buildSlashContext } from "../lib/contextFactory.js";
import { errorEmbed, successEmbed, brandEmbed, getEmbedStyle, EMOJIS } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";
import { checkTierWithFake, isBotOwner } from "../lib/permissions.js";
import { ownerState } from "../lib/ownerState.js";
import { isBlacklisted } from "../lib/blacklistCache.js";
import { handlePanelInteraction } from "../panels/router.js";
import { cleanError } from "../lib/format.js";
import { buildHelpHome, buildPagedCategoryEmbed, buildCategoryEmbed } from "../commands/utility/help.js";
import { buildLeaderboardMessage } from "../commands/utility/invites.js";
import { EmbedBuilder } from "discord.js";
import { handlePageButton } from "../features/pagination.js";
import { db } from "../db/index.js";
import { disabledCommands } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

// Inject "emoji @user: " into styled embeds — used in button handlers that bypass contextFactory
function applyMention(embeds: EmbedBuilder[], userId: string): EmbedBuilder[] {
  const mention = `<@${userId}>`;
  return embeds.map((eb) => {
    const style = getEmbedStyle(eb);
    if (!style || style === "brand" || style === "mod") return eb;
    const desc = (eb.data as any).description ?? "";
    const emoji =
      style === "success" ? EMOJIS.check :
      style === "error"   ? EMOJIS.deny  :
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

async function replyToSlash(interaction: ChatInputCommandInteraction, payload: any) {
  const editOriginal = async () => {
    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(payload);
      }
    } catch {
      // Another process/handler may have acknowledged it while local state is stale.
    }
    const editable = { ...payload };
    delete editable.flags;
    return interaction.webhook.editMessage("@original", editable);
  };
  if (interaction.deferred || interaction.replied) return editOriginal();
  try {
    return await interaction.reply(payload);
  } catch (error) {
    const code = (error as any)?.code ?? (error as any)?.rawError?.code;
    if (code === 40060 || interaction.deferred || interaction.replied) return editOriginal();
    throw error;
  }
}

async function handleSlashCommand(client: Client, interaction: ChatInputCommandInteraction) {
  const cmd = findCommand(interaction.commandName);
  if (!cmd) return;
  // Giveaways perform database and Discord API work; acknowledge immediately.
  if (cmd.name === "giveaways" && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply().catch(() => {});
  }
  if (cmd.guildOnly !== false && !interaction.guild) {
    return replyToSlash(interaction, {
      embeds: [errorEmbed("this command must be used in a server.")],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (cmd.ownerOnly && !isBotOwner(interaction.user.id)) {
    return replyToSlash(interaction, {
      embeds: [errorEmbed("this command is restricted to the bot owner.")],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!isBotOwner(interaction.user.id)) {
    const { blacklisted, reason } = await isBlacklisted(interaction.user.id);
    if (blacklisted) {
      return replyToSlash(interaction, {
        embeds: [
          errorEmbed(
            reason
              ? `you are blacklisted from Villain.\n**reason** — ${reason}`
              : "you are blacklisted from Villain."
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (interaction.guild && ownerState.disabledGuilds.has(interaction.guild.id) && !isBotOwner(interaction.user.id)) {
    return replyToSlash(interaction, { embeds: [errorEmbed("the bot is currently disabled in this server.")], flags: MessageFlags.Ephemeral });
  }

  if (interaction.member && cmd.permission && cmd.permission !== "everyone") {
    if (!(await checkTierWithFake(interaction.member as any, cmd.permission))) {
      return replyToSlash(interaction, {
        embeds: [errorEmbed(`${EMOJIS.warn} <@${interaction.user.id}>: You're **missing** permission: \`${cmd.permission}\``)],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (interaction.guild && !isBotOwner(interaction.user.id)) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const restrictions = await db.select().from(disabledCommands).where(and(
      eq(disabledCommands.guildId, interaction.guild.id),
      eq(disabledCommands.command, cmd.name),
    )).catch(() => []);
    const blocked = restrictions.some(row =>
      (row.targetType === "channel" && row.targetId === interaction.channelId) ||
      (row.targetType === "member" && row.targetId === interaction.user.id) ||
      (row.targetType === "role" && Boolean(member?.roles.cache.has(row.targetId)))
    );
    if (blocked) {
      return replyToSlash(interaction, {
        embeds: [errorEmbed(`\`${cmd.name}\` is disabled for you in this channel.`)],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  if (SLOW_CATEGORIES.has(cmd.category) && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply().catch(() => {});
  }

  const settings = interaction.guild ? await getGuildSettings(interaction.guild.id) : null;
  const prefix = settings?.prefix ?? config.defaultPrefix;
  const ctx = await buildSlashContext(client, interaction, prefix);
  try {
    const antinukeModule = ["ban", "softban", "tempban", "hackban", "massban"].includes(cmd.name) ? "ban" : cmd.name === "kick" ? "kick" : cmd.name === "delrole" ? "role" : null;
    if (antinukeModule && interaction.guild) {
      const { markAntinukeCommand } = await import("../features/antinuke.js");
      markAntinukeCommand(interaction.guild.id, interaction.user.id, antinukeModule);
    }
    await cmd.execute(ctx);
  } catch (err) {
    logger.error({ err, cmd: cmd.name }, "slash command error");
    const payload: any = {
      embeds: applyMention([errorEmbed(cleanError(err))], interaction.user.id),
      flags: MessageFlags.Ephemeral,
    };
    try {
      await replyToSlash(interaction, payload);
    } catch (replyErr) {
      logger.warn({ replyErr }, "failed to send slash error reply");
    }
  }
}

async function handleButton(client: Client, interaction: ButtonInteraction) {
  const id = interaction.customId;
  if (id.startsWith("page:")) return handlePageButton(client, interaction);
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
  if (id.startsWith("buttonrole:")) return handleButtonRoleInteraction(interaction);
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


async function handleButtonRoleInteraction(interaction: ButtonInteraction) {
  const bindingId = Number(interaction.customId.split(":")[1] ?? "0");
  if (!interaction.guild || !bindingId) return;
  const { pool } = await import("../db/index.js");
  const result = await pool.query(
    `SELECT role_id FROM button_role_bindings WHERE id=$1 AND guild_id=$2`,
    [bindingId, interaction.guild.id],
  );
  const row = result.rows[0];
  if (!row?.role_id) {
    return interaction.reply({ embeds: [errorEmbed("This button role is no longer configured.")], flags: MessageFlags.Ephemeral });
  }
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return;
  const role = interaction.guild.roles.cache.get(row.role_id);
  if (!role) return interaction.reply({ embeds: [errorEmbed("The configured role no longer exists.")], flags: MessageFlags.Ephemeral });
  if (role.managed || role.position >= interaction.guild.members.me!.roles.highest.position) {
    return interaction.reply({ embeds: [errorEmbed("I cannot manage that role.")], flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role).catch(() => null);
    return interaction.editReply({ embeds: [successEmbed("removed **" + role.name + "**.")] });
  }
  await member.roles.add(role).catch(() => null);
  return interaction.editReply({ embeds: [successEmbed("gave you **" + role.name + "**.")] });
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
  if (interaction.customId.startsWith("antinuke:config-select:")) {
    const [, , guildId, requesterId] = interaction.customId.split(":");
    if (!interaction.guild || interaction.guild.id !== guildId || interaction.user.id !== requesterId) {
      return interaction.reply({ content: "This AntiNuke selector is not valid for this user or server.", flags: MessageFlags.Ephemeral });
    }
    const { isAntinukeAdmin, getModuleConfigs } = await import("../features/antinuke.js");
    if (!(await isAntinukeAdmin(guildId, interaction.user.id, interaction.guild.ownerId))) {
      return interaction.reply({ content: "You are not authorized to configure AntiNuke.", flags: MessageFlags.Ephemeral });
    }
    const moduleName = interaction.values[0]?.toLowerCase();
    const validModules = ["ban", "kick", "role", "channel", "emoji", "webhook", "botadd", "vanity", "permissions"];
    if (!moduleName || !validModules.includes(moduleName)) {
      return interaction.reply({ content: "Invalid AntiNuke module selection.", flags: MessageFlags.Ephemeral });
    }
    const current = (await getModuleConfigs(guildId)).get(moduleName);
    const { getGuildSettings } = await import("../db/settings.js");
    const settings = await getGuildSettings(guildId);
    const modal = new ModalBuilder()
      .setCustomId("antinuke:config-submit:" + guildId + ":" + requesterId + ":" + moduleName)
      .setTitle("Configure " + moduleName);
    const field = (id: string, label: string, placeholder: string, required: boolean, value?: string) => {
      const input = new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setStyle(TextInputStyle.Short)
        .setRequired(required);
      if (value !== undefined) input.setValue(value);
      return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
    };
    modal.addComponents(
      field("setting", "Setting", "on or off", true, current?.enabled ? "on" : "off"),
      field("punishment", "Punishment", "ban, kick, timeout, strip, stripstaff, jail", false, current?.punishment ?? settings.antinukeAction ?? "ban"),
      field("threshold", "Threshold", "1–6 recommended; whole number 1–100", false, String(current?.threshold ?? 3)),
      field("command_detection", "Command detection", "true or false; ban, kick, and role only", false, current?.countCommands ? "true" : "false"),
    );
    return interaction.showModal(modal);
  }
  if (interaction.customId.startsWith("panel:")) return handlePanelInteraction(client, interaction as any);
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
  if (interaction.customId.startsWith("ar:modal:")) {
    const [, , action, requesterId] = interaction.customId.split(":");
    if (!interaction.guild || interaction.user.id !== requesterId || !["add", "update"].includes(action ?? "")) {
      return interaction.reply({ content: "This autoresponder form is not valid for this user or server.", flags: MessageFlags.Ephemeral });
    }
    const trigger = interaction.fields.getTextInputValue("trigger").trim().toLowerCase();
    const response = interaction.fields.getTextInputValue("response").trim();
    const flags = interaction.fields.getTextInputValue("flags").split(",").map(value => value.trim().toLowerCase());
    const strict = ["true", "yes", "on", "1"].includes(flags[0] ?? "");
    const reply = ["true", "yes", "on", "1"].includes(flags[1] ?? "");
    const deleteTrigger = ["true", "yes", "on", "1"].includes(flags[2] ?? "");
    const ignoreCommandCheck = ["true", "yes", "on", "1"].includes(flags[3] ?? "");
    const selfDestructValue = Number(flags[4] ?? 0);
    const selfDestructSeconds = selfDestructValue > 0 ? selfDestructValue : null;
    const ticketForm = interaction.fields.getTextInputValue("ticket_form").trim() || null;
    if (!trigger || !response) return interaction.reply({ content: "Trigger and response are required.", flags: MessageFlags.Ephemeral });
    if (selfDestructSeconds !== null && (!Number.isInteger(selfDestructSeconds) || selfDestructSeconds < 6 || selfDestructSeconds > 60)) {
      return interaction.reply({ content: "self_destruct must be a whole number from 6 to 60 seconds.", flags: MessageFlags.Ephemeral });
    }
    const { db } = await import("../db/index.js");
    const { autoresponders, ticketForms } = await import("../db/schema.js");
    const { and, eq } = await import("drizzle-orm");
    const { addAutoresponder, listAutoresponders } = await import("../features/autoresponders.js");
    if (ticketForm) {
      const forms = await db.select().from(ticketForms).where(eq(ticketForms.guildId, interaction.guild.id));
      if (!forms.some(form => (form.topic ?? "").toLowerCase() === ticketForm.toLowerCase())) {
        return interaction.reply({ content: `No ticket form found for topic "${ticketForm}". Configure it in ticket forms first.`, flags: MessageFlags.Ephemeral });
      }
    }
    const existing = (await listAutoresponders(interaction.guild.id)).find(row => row.trigger === trigger);
    if (action === "add") {
      if (existing) return interaction.reply({ content: "An autoresponder already exists for that trigger. Use update.", flags: MessageFlags.Ephemeral });
      await addAutoresponder(interaction.guild.id, trigger, response, strict ? "exact" : "contains", interaction.user.id, {
        notStrict: !strict, selfDestructSeconds, deleteTrigger, reply, ignoreCommandCheck,
      });
      await db.update(autoresponders).set({ ticketForm }).where(and(eq(autoresponders.guildId, interaction.guild.id), eq(autoresponders.trigger, trigger)));
    } else {
      if (!existing) return interaction.reply({ content: "No autoresponder found for that trigger.", flags: MessageFlags.Ephemeral });
      await db.update(autoresponders).set({
        response, matchType: strict ? "exact" : "contains", notStrict: !strict,
        selfDestructSeconds, deleteTrigger, reply, ignoreCommandCheck, ticketForm,
      }).where(and(eq(autoresponders.guildId, interaction.guild.id), eq(autoresponders.id, existing.id)));
    }
    return interaction.reply({ content: `Autoresponder ${action === "add" ? "created" : "updated"} for "${trigger}".`, flags: MessageFlags.Ephemeral });
  }
  if (interaction.customId.startsWith("antinuke:config-submit:")) {
    const [, , guildId, requesterId, moduleName] = interaction.customId.split(":");
    if (!interaction.guild || interaction.guild.id !== guildId || interaction.user.id !== requesterId) {
      return interaction.reply({ content: "This AntiNuke configuration form is not valid for this user or server.", flags: MessageFlags.Ephemeral });
    }
    const { isAntinukeAdmin, getModuleConfigs, invalidateModuleCache } = await import("../features/antinuke.js");
    if (!(await isAntinukeAdmin(guildId, interaction.user.id, interaction.guild.ownerId))) {
      return interaction.reply({ content: "You are not authorized to configure AntiNuke.", flags: MessageFlags.Ephemeral });
    }
    const setting = interaction.fields.getTextInputValue("setting").trim().toLowerCase();
    const punishmentInput = interaction.fields.getTextInputValue("punishment").trim().toLowerCase();
    const thresholdInput = interaction.fields.getTextInputValue("threshold").trim();
    const commandInput = interaction.fields.getTextInputValue("command_detection").trim().toLowerCase();
    const validModules = ["ban", "kick", "role", "channel", "emoji", "webhook", "botadd", "vanity", "permissions"];
    const validPunishments = ["ban", "kick", "timeout", "strip", "stripstaff", "jail"];
    if (!moduleName || !validModules.includes(moduleName)) return interaction.reply({ content: "Invalid module. Use one of: " + validModules.join(", ") + ".", flags: MessageFlags.Ephemeral });
    if (setting !== "on" && setting !== "off") return interaction.reply({ content: "Setting must be on or off.", flags: MessageFlags.Ephemeral });
    if (punishmentInput && !validPunishments.includes(punishmentInput)) return interaction.reply({ content: "Invalid punishment. Use: " + validPunishments.join(", ") + ".", flags: MessageFlags.Ephemeral });
    const threshold = thresholdInput ? Number(thresholdInput) : null;
    if (thresholdInput && (!Number.isInteger(threshold) || Number(threshold) < 1 || Number(threshold) > 100)) return interaction.reply({ content: "Threshold must be a whole number from 1 to 100.", flags: MessageFlags.Ephemeral });
    if (["ban", "kick", "role"].includes(moduleName) && commandInput && !["true", "false", "on", "off"].includes(commandInput)) return interaction.reply({ content: "Command detection must be true or false.", flags: MessageFlags.Ephemeral });
    const { db } = await import("../db/index.js");
    const { antinukeModules } = await import("../db/schema.js");
    const { getGuildSettings, updateGuildSettings } = await import("../db/settings.js");
    const current = (await getModuleConfigs(guildId)).get(moduleName);
    const guildSettings = await getGuildSettings(guildId);
    const enabled = setting === "on";
    const countCommands = ["ban", "kick", "role"].includes(moduleName) && commandInput ? ["true", "on"].includes(commandInput) : (current?.countCommands ?? false);
    const values = {
      guildId, module: moduleName, enabled,
      threshold: ["botadd", "vanity"].includes(moduleName) ? 1 : (threshold ?? current?.threshold ?? 3),
      punishment: punishmentInput || current?.punishment || guildSettings.antinukeAction || "ban",
      countCommands: ["ban", "kick", "role"].includes(moduleName) ? countCommands : false,
    };
    await db.insert(antinukeModules).values(values).onConflictDoUpdate({
      target: [antinukeModules.guildId, antinukeModules.module],
      set: { enabled: values.enabled, threshold: values.threshold, punishment: values.punishment, countCommands: values.countCommands },
    });
    invalidateModuleCache(guildId);
    if (enabled) await updateGuildSettings(guildId, { antinukeEnabled: true });
    return interaction.reply({ content: "AntiNuke " + moduleName + " protection is now " + setting + ".", flags: MessageFlags.Ephemeral });
  }
  if (interaction.customId.startsWith("panel:")) return handlePanelInteraction(client, interaction as any);
  const { handleTicketModal } = await import("../features/tickets.js");
  if (interaction.customId.startsWith("ticket_close_modal_") || interaction.customId.startsWith("ticket_form_")) return handleTicketModal(interaction as any);
}
