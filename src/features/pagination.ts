import { type Client, type TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, type ButtonInteraction } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { paginatedEmbeds } from "../db/schema.js";
import { parseScript } from "../lib/scripting.js";
import { logger } from "../lib/logger.js";
import { config } from "../config.js";

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
  if (!paginated) return interaction.reply({ content: "Paginated embed not found.", ephemeral: true });

  let page = paginated.currentPage;
  if (dir === "next") page = Math.min(page + 1, paginated.pages.length - 1);
  else if (dir === "prev") page = Math.max(page - 1, 0);

  await db.update(paginatedEmbeds).set({ currentPage: page }).where(eq(paginatedEmbeds.messageId, messageId));

  const { embed, content } = parseScript(paginated.pages[page] ?? "");
  const navRow = buildNavRow(page, paginated.pages.length, messageId);

  await interaction.update({ content: content ?? "", embeds: embed ? [embed] : [], components: [navRow] }).catch(() => {});
}
