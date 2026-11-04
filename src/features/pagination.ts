import { type Client, type TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, type ButtonInteraction } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { paginatedEmbeds } from "../db/schema.js";
import { parseScript } from "../lib/scripting.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";

export const PAGINATION_PREV = "⬅️";
export const PAGINATION_NEXT = "➡️";

export async function restorePaginationReactions(message: any): Promise<void> {
  await message.react(PAGINATION_PREV);
  await message.react(PAGINATION_NEXT);
}

export async function handlePaginationReaction(reaction: any, user: any): Promise<void> {
  if (user.bot || !reaction.message.guildId) return;
  const emoji = reaction.emoji?.name;
  if (emoji !== PAGINATION_PREV && emoji !== PAGINATION_NEXT) return;
  const rows = await db.select().from(paginatedEmbeds).where(eq(paginatedEmbeds.messageId, reaction.message.id));
  const paginated = rows[0];
  if (!paginated || paginated.guildId !== reaction.message.guildId || paginated.channelId !== reaction.message.channelId) return;
  const nextPage = emoji === PAGINATION_NEXT
    ? Math.min(paginated.currentPage + 1, paginated.pages.length - 1)
    : Math.max(paginated.currentPage - 1, 0);
  if (nextPage !== paginated.currentPage) {
    const parsed = parseScript(paginated.pages[nextPage] ?? "");
    await reaction.message.edit({ content: parsed.content ?? "", embeds: parsed.embeds }).catch(() => {});
    await db.update(paginatedEmbeds).set({ currentPage: nextPage }).where(eq(paginatedEmbeds.messageId, paginated.messageId));
  }
  await reaction.users.remove(user.id).catch(() => {});
}

export function buildNavRow(current: number, total: number, messageId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`page:prev:${messageId}`)
      .setLabel("←")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current === 0),
    new ButtonBuilder()
      .setCustomId(`page:info:${messageId}`)
      .setLabel(`${current + 1} / ${total}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`page:next:${messageId}`)
      .setLabel("→")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current === total - 1),
  );
}

export async function handlePageButton(client: Client, interaction: ButtonInteraction): Promise<void> {
  const [, dir, messageId] = interaction.customId.split(":");
  if (!messageId) return;

  const rows = await db.select().from(paginatedEmbeds).where(eq(paginatedEmbeds.messageId, messageId));
  const paginated = rows[0];
  if (!paginated) { await interaction.reply({ content: "Paginated embed not found.", ephemeral: true }); return; }
  if (interaction.guildId !== paginated.guildId || interaction.message.id !== paginated.messageId) {
    await interaction.reply({ content: "This pagination belongs to another server or message.", ephemeral: true }).catch(() => {});
    return;
  }

  let page = paginated.currentPage;
  if (dir === "next") page = Math.min(page + 1, paginated.pages.length - 1);
  else if (dir === "prev") page = Math.max(page - 1, 0);

  await db.update(paginatedEmbeds).set({ currentPage: page }).where(eq(paginatedEmbeds.messageId, messageId));

  const { embeds, content } = parseScript(paginated.pages[page] ?? "");
  const navRow = buildNavRow(page, paginated.pages.length, messageId);

  await interaction.update({ content: content ?? "", embeds, components: [navRow] }).catch(() => {});
}
