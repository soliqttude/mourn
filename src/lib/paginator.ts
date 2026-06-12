import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Message,
} from "discord.js";
import type { CommandContext } from "./command.js";
import { config } from "../config.js";
import { logger } from "./logger.js";

// ── Options ────────────────────────────────────────────────────────────────────

export interface PaginateOpts {
  /**
   * Context label shown in the footer.
   * e.g. "Moderation" → "Mourn  ·  Moderation  ·  Page 1 / 3"
   * Omit for: "Mourn  ·  Page 1 / 3"
   */
  label?: string;

  /**
   * How long (ms) before the collector ends and buttons are disabled.
   * Default: 60 000 (60 seconds).
   */
  timeout?: number;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Builds the footer text string, matching the existing embeds.ts convention. */
function footerText(label: string | undefined, page: number, total: number): string {
  const pageStr = `Page ${page} / ${total}`;
  return label
    ? `${config.embedFooter}  ·  ${label}  ·  ${pageStr}`
    : `${config.embedFooter}  ·  ${pageStr}`;
}

/**
 * Mutates each embed in-place to inject the correct "Page X / Y" footer.
 * Called once at paginate() entry — commands never need to set footers manually.
 */
function injectFooters(pages: EmbedBuilder[], label?: string): void {
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    pages[i]!.setFooter({ text: footerText(label, i + 1, total) });
  }
}

/**
 * Builds an ActionRow with ← → buttons.
 * Automatically disables the appropriate button on the first or last page.
 */
function buildRow(
  uid: string,
  currentPage: number,
  total: number,
  forceDisabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pag:${uid}:prev`)
      .setLabel("←")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(forceDisabled || currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`pag:${uid}:next`)
      .setLabel("→")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(forceDisabled || currentPage === total - 1),
  );
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Sends a paginated embed response using ← → buttons.
 *
 * Usage:
 *   import { paginate } from "../../lib/paginator.js";
 *
 *   const pages = chunkArray(items, 10).map((chunk, i) =>
 *     brandEmbed({ title: "Results", description: chunk.join("\n") })
 *   );
 *   await paginate(ctx, pages, { label: "Moderation" });
 *
 * Edge cases handled:
 *   - Empty pages array  → warns and returns without sending anything
 *   - Single page        → sends without buttons (no collector overhead)
 *   - Non-owner clicks   → ephemeral "not yours" reply, no navigation
 *   - Slash deferred     → uses editReply + fetchReply correctly
 *   - Send failure       → caught, logged, returns silently
 *   - Edit on timeout    → caught, ignored (message may be deleted)
 */
export async function paginate(
  ctx: CommandContext,
  pages: EmbedBuilder[],
  opts: PaginateOpts = {},
): Promise<void> {
  const timeout = opts.timeout ?? 60_000;

  // ── Guard: empty ────────────────────────────────────────────────────────────
  if (pages.length === 0) {
    logger.warn("paginate() called with an empty pages array — nothing sent");
    return;
  }

  // ── Inject footers into every page ─────────────────────────────────────────
  injectFooters(pages, opts.label);

  // ── Single page — no buttons or collector needed ────────────────────────────
  if (pages.length === 1) {
    try {
      await ctx.reply({ embeds: [pages[0]!] });
    } catch (err) {
      logger.warn({ err }, "paginate: failed to send single-page reply");
    }
    return;
  }

  // ── Multi-page setup ────────────────────────────────────────────────────────
  //
  // Use a short random UID so button customIds are unique per paginator
  // instance. This prevents collectors from different commands in the same
  // channel from cross-triggering each other.
  const uid = Math.random().toString(36).slice(2, 9);
  let currentPage = 0;

  // ── Send first page ─────────────────────────────────────────────────────────
  let sentMessage: Message;

  try {
    if (ctx.source === "slash") {
      const interaction = ctx.raw as ChatInputCommandInteraction;
      const payload = {
        embeds: [pages[0]!],
        components: [buildRow(uid, currentPage, pages.length) as any],
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
      } else {
        await interaction.reply(payload);
      }
      // fetchReply returns the actual Message object, needed for the collector
      sentMessage = (await interaction.fetchReply()) as Message;
    } else {
      const message = ctx.raw as Message;
      sentMessage = await message.reply({
        embeds: [pages[0]!],
        components: [buildRow(uid, currentPage, pages.length) as any],
        allowedMentions: { parse: [] },
      });
    }
  } catch (err) {
    logger.warn({ err }, "paginate: failed to send first page — aborting pagination");
    return;
  }

  // ── Collector ───────────────────────────────────────────────────────────────
  //
  // Filter to only our UID's button customIds. Other paginators running in the
  // same channel won't interfere because their UIDs differ.
  const PREV = `pag:${uid}:prev`;
  const NEXT = `pag:${uid}:next`;

  const collector = sentMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout,
    filter: (i) => i.customId === PREV || i.customId === NEXT,
  });

  collector.on("collect", async (interaction) => {
    // ── Non-owner click — reply ephemerally, do not navigate ─────────────────
    if (interaction.user.id !== ctx.user.id) {
      await interaction
        .reply({ content: "these controls aren't yours.", flags: MessageFlags.Ephemeral })
        .catch(() => {});
      return;
    }

    // ── Navigate ─────────────────────────────────────────────────────────────
    if (interaction.customId === PREV) {
      currentPage = Math.max(0, currentPage - 1);
    } else {
      currentPage = Math.min(pages.length - 1, currentPage + 1);
    }

    // interaction.update() is an interaction response — safe from rate limits,
    // unlike raw message.edit() which counts against the global edit rate limit.
    await interaction
      .update({
        embeds: [pages[currentPage]!],
        components: [buildRow(uid, currentPage, pages.length) as any],
      })
      .catch((err) => {
        logger.warn({ err }, "paginate: failed to update page on button click");
      });
  });

  // ── Timeout: disable buttons ────────────────────────────────────────────────
  //
  // On collector end (timeout or max interactions), disable both buttons so
  // the message is clearly "done" and does not produce failed interactions.
  // Wrapped in catch — message may have been deleted.
  collector.on("end", async () => {
    await sentMessage
      .edit({
        components: [buildRow(uid, currentPage, pages.length, true) as any],
      })
      .catch(() => {});
  });
}

// ── Utility: chunk array ───────────────────────────────────────────────────────

/**
 * Splits an array into chunks of `size`.
 * Use this in commands to build one page per chunk before calling paginate().
 *
 * Example:
 *   const chunks = chunkArray(rows, 10); // 10 items per page
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
