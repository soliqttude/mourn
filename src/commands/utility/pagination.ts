import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { paginatedEmbeds } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { parseScript } from "../../lib/scripting.js";
import { buildNavRow } from "../../features/pagination.js";

function extractMessageId(input: string): string {
  const match = input.match(/(?:channels\/\d+\/\d+\/)?(\d{15,25})/);
  return match?.[1] ?? input.replace(/[<#>]/g, "");
}

export const command: HybridCommand = {
  name: "pagination",
  aliases: ["pages"],
  description: "Create and manage paginated embeds.",
  category: "utility",
  permission: "manage_messages",
  guildOnly: true,
  usage: "pagination (set|add|update|remove|delete|reset|list|restorereactions) [message link] [args]",
  examples: [
    "pagination set [message link]",
    "pagination add [message link] {embed}{title: Page 2}",
    "pagination update [message link] 2 {embed}{title: Updated Page 2}",
    "pagination remove [message link] 2",
    "pagination delete [message link]",
    "pagination reset",
    "pagination list",
    "pagination restorereactions [message link]",
  ],
  options: [
    { name: "subcommand", description: "set | add | update | remove | delete | reset | list | restorereactions", type: ApplicationCommandOptionType.String, required: true },
    { name: "message", description: "Message link or ID", type: ApplicationCommandOptionType.String, required: false },
    { name: "page", description: "Page number", type: ApplicationCommandOptionType.Integer, required: false },
    { name: "code", description: "Embed code / page content", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Channel for set", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const guildId = ctx.guild.id;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const rawMessage = ctx.getString("message") ?? ctx.args[1];
    const msgId = rawMessage ? extractMessageId(rawMessage) : "";
    const pageArg = ctx.getInteger("page") ?? (ctx.args[2] ? Number(ctx.args[2]) : NaN);
    const code = ctx.getString("code") ?? (ctx.args.length > 3 ? ctx.args.slice(3).join(" ") : "");

    if (sub === "reset") {
      await db.delete(paginatedEmbeds).where(eq(paginatedEmbeds.guildId, guildId));
      return ctx.reply({ embeds: [successEmbed("pagination has been reset.", "utility")] });
    }

    if (sub === "list") {
      const rows = await db.select().from(paginatedEmbeds).where(eq(paginatedEmbeds.guildId, guildId));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No paginated embeds in this server.")] });
      const lines = rows.map(r => `\`undefined\` → <#${r.channelId}> (${r.pages.length} pages)`);
      return ctx.reply({ embeds: [brandEmbed({ title: "Paginated Embeds", description: lines.join("\n") })] });
    }

    if (!msgId) {
      return ctx.reply({ embeds: [errorEmbed("Provide a **message link**.")] });
    }

    const rows = await db.select().from(paginatedEmbeds)
      .where(and(eq(paginatedEmbeds.messageId, msgId), eq(paginatedEmbeds.guildId, guildId)));
    const existing = rows[0];

    if (sub === "set") {
      if (existing) return ctx.reply({ embeds: [errorEmbed("This message is already configured for pagination.")] });
      const channel = ctx.getChannel("channel") ?? (ctx.guild.channels.cache.get(rawMessage?.split("/").slice(-2, -1)[0] ?? "") ?? ctx.channel);
      if (!channel?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Provide a valid text channel.")] });
      const message = await (channel as any).messages.fetch(msgId).catch(() => null);
      if (!message) return ctx.reply({ embeds: [errorEmbed("I couldn't find that message.")] });
      const firstCode = code || message.content || (message.embeds[0] ? message.embeds[0].toJSON().description ?? "" : "");
      if (!firstCode) return ctx.reply({ embeds: [errorEmbed("The message has no page content to paginate.")] });
      await db.insert(paginatedEmbeds).values({ messageId: msgId, guildId, channelId: channel.id, pages: [firstCode], currentPage: 0 });
      await message.edit({ components: [buildNavRow(0, 1, msgId)] }).catch(() => {});
      return ctx.reply({ embeds: [successEmbed("pagination enabled for that message.", "utility")] });
    }

    if (!existing) return ctx.reply({ embeds: [errorEmbed("Paginated embed not found.")] });

    if (sub === "add") {
      if (!code) return ctx.reply({ embeds: [errorEmbed("Provide the page content.")] });
      const pages = [...existing.pages, code];
      await db.update(paginatedEmbeds).set({ pages }).where(eq(paginatedEmbeds.messageId, msgId));
      return ctx.reply({ embeds: [successEmbed(`page ${pages.length} added.`, "utility")] });
    }

    if (sub === "update") {
      const page = Number.isInteger(pageArg) ? pageArg : NaN;
      if (!Number.isInteger(page) || page < 1 || page > existing.pages.length)
        return ctx.reply({ embeds: [errorEmbed(`Page must be between 1 and ${existing.pages.length}.`)] });
      if (!code) return ctx.reply({ embeds: [errorEmbed("Provide the updated page content.")] });
      const pages = [...existing.pages];
      pages[page - 1] = code;
      await db.update(paginatedEmbeds).set({ pages }).where(eq(paginatedEmbeds.messageId, msgId));
      const channel = ctx.guild.channels.cache.get(existing.channelId);
      if (channel?.isTextBased()) {
        const message = await (channel as any).messages.fetch(msgId).catch(() => null);
        if (message && existing.currentPage === page - 1) {
          const parsed = parseScript(code, { guild: ctx.guild });
          await message.edit({ content: parsed.content ?? "", embeds: parsed.embeds, components: [buildNavRow(existing.currentPage, pages.length, msgId)] }).catch(() => {});
        }
      }
      return ctx.reply({ embeds: [successEmbed(`page ${page} updated.`, "utility")] });
    }

    if (sub === "remove") {
      const page = Number.isInteger(pageArg) ? pageArg : NaN;
      if (!Number.isInteger(page) || page < 1 || page > existing.pages.length)
        return ctx.reply({ embeds: [errorEmbed(`Page must be between 1 and ${existing.pages.length}.`)] });
      if (existing.pages.length <= 1) return ctx.reply({ embeds: [errorEmbed("A pagination needs at least one page. Use delete instead.")] });
      const pages = existing.pages.filter((_, i) => i !== page - 1);
      const currentPage = Math.min(existing.currentPage, pages.length - 1);
      await db.update(paginatedEmbeds).set({ pages, currentPage }).where(eq(paginatedEmbeds.messageId, msgId));
      return ctx.reply({ embeds: [successEmbed(`page ${page} removed.`, "utility")] });
    }

    if (sub === "delete") {
      await db.delete(paginatedEmbeds).where(eq(paginatedEmbeds.messageId, msgId));
      const channel = ctx.guild.channels.cache.get(existing.channelId);
      if (channel?.isTextBased()) {
        const message = await (channel as any).messages.fetch(msgId).catch(() => null);
        if (message) await message.edit({ components: [] }).catch(() => {});
      }
      return ctx.reply({ embeds: [successEmbed("pagination deleted.", "utility")] });
    }

    if (sub === "restorereactions") {
      const channel = ctx.guild.channels.cache.get(existing.channelId);
      if (!channel?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("I couldn't find the pagination channel.")] });
      const message = await (channel as any).messages.fetch(msgId).catch(() => null);
      if (!message) return ctx.reply({ embeds: [errorEmbed("I couldn't find that message.")] });
      await message.edit({ components: [buildNavRow(existing.currentPage, existing.pages.length, msgId)] }).catch(() => {});
      return ctx.reply({ embeds: [successEmbed("pagination controls restored.", "utility")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Invalid pagination subcommand.")] });
  },
};
