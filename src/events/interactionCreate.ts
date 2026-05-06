import {
  type Client,
  type Interaction,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} from "discord.js";
import { findCommand, commands } from "../handlers/registry.js";
import { buildSlashContext } from "../lib/contextFactory.js";
import { errorEmbed, brandEmbed } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";
import { checkTier, isBotOwner } from "../lib/permissions.js";
import { handlePanelInteraction } from "../panels/router.js";

const CAT_EMOJI: Record<string, string> = {
  economy: "💰", fun: "🎉", moderation: "🛡️", settings: "⚙️",
  utility: "🔧", levels: "⭐", giveaway: "🎁", tags: "🏷️",
  voicemaster: "🎤", custom: "🤖", owner: "👑",
};

/**
 * Safe follow-up: tries interaction.followUp first, falls back to channel.send
 * if the original message was deleted (MESSAGE_REFERENCE_UNKNOWN_MESSAGE).
 */
async function safeFollowUp(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  payload: Parameters<ButtonInteraction["followUp"]>[0]
) {
  try {
    await interaction.followUp(payload);
  } catch {
    try {
      await interaction.channel?.send(payload as any);
    } catch { /* silently ignore if channel send also fails */ }
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

async function handleSlashCommand(client: Client, interaction: ChatInputCommandInteraction) {
  const cmd = findCommand(interaction.commandName);
  if (!cmd) return;
  if (cmd.guildOnly !== false && !interaction.guild) {
    return interaction.reply({
      embeds: [errorEmbed("This command must be used in a server.")],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (cmd.ownerOnly && !isBotOwner(interaction.user.id)) {
    return interaction.reply({
      embeds: [errorEmbed("This command is restricted to the bot owner.")],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (interaction.member && cmd.permission && cmd.permission !== "everyone") {
    if (!checkTier(interaction.member as any, cmd.permission)) {
      return interaction.reply({
        embeds: [errorEmbed("You don't have permission to use this command.")],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
  const settings = interaction.guild ? await getGuildSettings(interaction.guild.id) : null;
  const prefix = settings?.prefix ?? config.defaultPrefix;
  const ctx = await buildSlashContext(client, interaction, prefix);
  try {
    await cmd.execute(ctx);
  } catch (err) {
    logger.error({ err, cmd: cmd.name }, "Slash command error");
    const payload: any = {
      embeds: [errorEmbed((err as Error).message || "An unexpected error occurred.")],
      flags: MessageFlags.Ephemeral,
    };
    try {
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
      else await interaction.reply(payload);
    } catch { /* ignore */ }
  }
}

async function handleButton(client: Client, interaction: ButtonInteraction) {
  const id = interaction.customId;
  if (id.startsWith("panel:")) return handlePanelInteraction(client, interaction);
  const { handleTicketButton } = await import("../features/tickets.js");
  if (id.startsWith("ticket:")) return handleTicketButton(client, interaction);
  const { handleVMButton } = await import("../features/voicemaster.js");
  if (id.startsWith("vm:")) return handleVMButton(client, interaction);
  if (id === "verify_button") {
    const { handleVerificationButton } = await import("../features/verification.js");
    return handleVerificationButton(client, interaction);
  }
  if (id.startsWith("trivia_")) return handleTriviaButton(client, interaction);
  if (id.startsWith("bj_")) return handleBlackjackButton(client, interaction);
  if (id === "suggest_up" || id === "suggest_down") return handleSuggestionVote(client, interaction);
}

async function handleTriviaButton(_client: Client, interaction: ButtonInteraction) {
  const [, chosen, correct, userId] = interaction.customId.split("_");
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "This isn't your trivia question!", flags: 64 });
  }
  const { successEmbed } = await import("../lib/embeds.js");
  if (chosen === correct) {
    await interaction.update({ components: [] }).catch(() => {});
    return safeFollowUp(interaction, { embeds: [successEmbed(`✅ Correct! The answer was **${correct}**.`)] });
  } else {
    await interaction.update({ components: [] }).catch(() => {});
    return safeFollowUp(interaction, { embeds: [errorEmbed(`❌ Wrong! The correct answer was **${correct}**.`)] });
  }
}

async function handleBlackjackButton(_client: Client, interaction: ButtonInteraction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const userId = parts[2];
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "This isn't your blackjack game!", flags: 64 });
  }
  const { successEmbed } = await import("../lib/embeds.js");
  const { addBalance } = await import("../features/economy.js");
  const sessions = (global as any).__bjSessions as Map<string, any> ?? new Map();
  const session = sessions.get(userId);
  if (!session) return interaction.update({ components: [] }).catch(() => {});
  function draw(deck: string[]) { return deck.splice(Math.floor(Math.random() * deck.length), 1)[0]!; }
  function cardValue(card: string) { const r = card.slice(0, -1); if (r === "A") return 11; if (["J","Q","K"].includes(r)) return 10; return parseInt(r); }
  function handValue(hand: string[]) { let val = hand.reduce((a, c) => a + cardValue(c), 0); let aces = hand.filter(c => c.startsWith("A")).length; while (val > 21 && aces > 0) { val -= 10; aces--; } return val; }
  if (action === "hit") {
    session.player.push(draw(session.deck));
    const pv = handValue(session.player);
    if (pv > 21) {
      sessions.delete(userId);
      await interaction.update({ components: [] }).catch(() => {});
      return safeFollowUp(interaction, { embeds: [errorEmbed(`Bust! Your hand: ${session.player.join(" ")} (${pv}). Lost **${session.bet}** coins.`)] });
    }
    const { ActionRowBuilder: ARB, ButtonBuilder, ButtonStyle } = await import("discord.js");
    const row = new ARB<typeof ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${userId}`).setLabel("Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${userId}`).setLabel("Stand").setStyle(ButtonStyle.Secondary),
    );
    return interaction.update({
      embeds: [brandEmbed({ title: "🃏 Blackjack", description: `**Your hand:** ${session.player.join(" ")} (${pv})\n**Dealer:** ${session.dealer[0]} 🂠\nBet: **${session.bet}**`, page: "Blackjack" })],
      components: [row as any],
    }).catch(() => {});
  }
  if (action === "stand") {
    while (handValue(session.dealer) < 17) session.dealer.push(draw(session.deck));
    const pv = handValue(session.player);
    const dv = handValue(session.dealer);
    sessions.delete(userId);
    await interaction.update({ components: [] }).catch(() => {});
    if (dv > 21 || pv > dv) {
      const win = session.bet * 2;
      await addBalance(session.guildId, userId, win);
      return safeFollowUp(interaction, { embeds: [successEmbed(`You win! Your: ${session.player.join(" ")} (${pv}) vs Dealer: ${session.dealer.join(" ")} (${dv}). Won **${win}** coins!`)] });
    } else if (pv === dv) {
      await addBalance(session.guildId, userId, session.bet);
      return safeFollowUp(interaction, { embeds: [brandEmbed({ description: `Push! Tie game. Your bet of **${session.bet}** returned.`, page: "Blackjack" })] });
    } else {
      return safeFollowUp(interaction, { embeds: [errorEmbed(`Dealer wins. Your: ${session.player.join(" ")} (${pv}) vs Dealer: ${session.dealer.join(" ")} (${dv}). Lost **${session.bet}** coins.`)] });
    }
  }
}

async function handleSuggestionVote(_client: Client, interaction: ButtonInteraction) {
  await interaction.deferUpdate().catch(() => {});
  const { db } = await import("../db/index.js");
  const { suggestions } = await import("../db/schema.js");
  const { eq, sql } = await import("drizzle-orm");
  const row = await db.select().from(suggestions).where(eq(suggestions.messageId, interaction.message.id));
  if (!row[0]) return;
  const isUp = interaction.customId === "suggest_up";
  await db.update(suggestions).set(isUp ? { upvotes: sql`${suggestions.upvotes} + 1` } : { downvotes: sql`${suggestions.downvotes} + 1` }).where(eq(suggestions.messageId, interaction.message.id));
  const updated = await db.select().from(suggestions).where(eq(suggestions.messageId, interaction.message.id));
  const s = updated[0];
  if (!s) return;
  const { ActionRowBuilder: ARB, ButtonBuilder, ButtonStyle } = await import("discord.js");
  const newRow = new ARB<typeof ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("suggest_up").setLabel(`👍 ${s.upvotes}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("suggest_down").setLabel(`👎 ${s.downvotes}`).setStyle(ButtonStyle.Danger),
  );
  await interaction.message.edit({ components: [newRow as any] }).catch(() => {});
}

async function handleSelect(client: Client, interaction: StringSelectMenuInteraction) {
  if (interaction.customId.startsWith("panel:")) return handlePanelInteraction(client, interaction);
  if (interaction.customId === "help:category") return handleHelpCategorySelect(interaction);
}

async function handleHelpCategorySelect(interaction: StringSelectMenuInteraction) {
  const category = interaction.values[0]!;
  const cmds = [...commands.values()]
    .filter((c) => c.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines = cmds.map((c) => `\`${c.name}\` — ${c.description.slice(0, 65)}`);
  let description = lines.join("\n");
  if (description.length > 3900) {
    const kept = [];
    let len = 0;
    for (const l of lines) { if (len + l.length + 1 > 3900) break; kept.push(l); len += l.length + 1; }
    description = kept.join("\n") + `\n…and ${lines.length - kept.length} more`;
  }

  const categories = [...new Set([...commands.values()].map((c) => c.category))].sort();
  const select = new StringSelectMenuBuilder()
    .setCustomId("help:category")
    .setPlaceholder(`${CAT_EMOJI[category] ?? "📌"} ${category.charAt(0).toUpperCase() + category.slice(1)}`)
    .addOptions(
      categories.map((cat) => ({
        label: `${CAT_EMOJI[cat] ?? "📌"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: cat,
        description: `Browse ${cat} commands`,
        default: cat === category,
      }))
    );
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  await interaction.update({
    embeds: [
      brandEmbed({
        title: `${CAT_EMOJI[category] ?? "📌"} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands (${cmds.length})`,
        description,
        page: "Help",
      }),
    ],
    components: [row as any],
  }).catch(() => {});
}

async function handleModal(client: Client, interaction: ModalSubmitInteraction) {
  if (interaction.customId.startsWith("panel:")) return handlePanelInteraction(client, interaction);
  const { handleTicketModal } = await import("../features/tickets.js");
  if (interaction.customId.startsWith("ticket:")) return handleTicketModal(client, interaction);
}
