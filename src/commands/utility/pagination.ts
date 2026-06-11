import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { paginatedEmbeds } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { parseScript } from "../../lib/scripting.js";
import { buildNavRow } from "../../features/pagination.js";
import { resolveChannel } from "../../lib/parsing.js";

export const command: HybridCommand = {
  name: "pagination",
  aliases: ["pages"],
  description: "Create and manage paginated embeds. Subcommands: create, add, update, remove, delete, list",
  category: "utility",
  permission: "mod",
  guildOnly: true,
  usage: "pagination [create|add|update|remove|delete|list] [args]",
  examples: [
    "pagination create #channel {embed}{title: Page 1}",
    "pagination add [messageId] {embed}{title: Page 2}",
    "pagination delete [messageId]",
  ],
  options: [
    { name: "subcommand", description: "create | add | update | remove | delete | list", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Channel (for create)", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "messageid", description: "Message ID", type: ApplicationCommandOptionType.String, required: false },
    { name: "code", description: "Embed code / page content", type: ApplicationCommandOptionType.String, required: false },
    { name: "page", description: "Page number (for update/remove)", type: ApplicationCommandOptionType.Number, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const guildId = ctx.guild.id;

    if (sub === "create") {
      const ch = ctx.getChannel("channel") ?? (ctx.args[1] ? resolveChannel(ctx.guild, ctx.args[1]) : ctx.channel);
      if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Provide a valid text **channel**.")] });
      const code = ctx.getString("code") ?? ctx.args.slice(2).join(" ");
      if (!code) return ctx.reply({ embeds: [errorEmbed("Provide the first page content.")] });
      const { embed, content } = parseScript(code, { guild: ctx.guild });
      const msg = await (ch as any).send({ content: content ?? undefined, embeds: embed ? [embed] : [], components: [buildNavRow(0, 1, "placeholder")] });
      await db.insert(paginatedEmbeds).values({ messageId: msg.id, guildId, channelId: ch.id, pages: [code], currentPage: 0 });
      await msg.edit({ components: [buildNavRow(0, 1, msg.id)] });
      return ctx.reply({ embeds: [successEmbed(`paginated embed created in <#${ch.id}>. use \`pagination add ${msg.id}\` to add more pages.`)] });
    }

    if (sub === "add") {
      const msgId = ctx.getString("messageid") ?? ctx.args[1];
      if (!msgId) return ctx.reply({ embeds: [errorEmbed("Provide the message ID.")] });
      const code = ctx.getString("code") ?? ctx.args.slice(2).join(" ");
      if (!code) return ctx.reply({ embeds: [errorEmbed("Provide the page content.")] });
      const rows = await db.select().from(paginatedEmbeds).where(and(eq(paginatedEmbeds.messageId, msgId), eq(paginatedEmbeds.guildId, guildId)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("Paginated embed not found.")] });
      const pe = rows[0];
      const pages = [...pe.pages, code];
      await db.update(paginatedEmbeds).set({ pages }).where(eq(paginatedEmbeds.messageId, msgId));
      const ch = ctx.guild.channels.cache.get(pe.channelId);
      if (ch?.isTextBased()) {
        const msg = await (ch as any).messages.fetch(msgId).catch(() => null);
        if (msg) await msg.edit({ components: [buildNavRow(pe.currentPage, pages.length, msgId)] }).catch(() => {});
      }
      return ctx.reply({ embeds: [successEmbed(`page ${pages.length} added.`)] });
    }

    if (sub === "delete" || sub === "remove") {
      const msgId = ctx.getString("messageid") ?? ctx.args[1];
      if (!msgId) return ctx.reply({ embeds: [errorEmbed("Provide the message ID.")] });
      const rows = await db.select().from(paginatedEmbeds).where(and(eq(paginatedEmbeds.messageId, msgId), eq(paginatedEmbeds.guildId, guildId)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("Paginated embed not found.")] });
      await db.delete(paginatedEmbeds).where(eq(paginatedEmbeds.messageId, msgId));
      const pe = rows[0];
      const ch = ctx.guild.channels.cache.get(pe.channelId);
      if (ch?.isTextBased()) {
        const msg = await (ch as any).messages.fetch(msgId).catch(() => null);
        if (msg) await msg.edit({ components: [] }).catch(() => {});
      }
      return ctx.reply({ embeds: [successEmbed("Paginated embed deleted.")] });
    }

    if (sub === "list") {
      const rows = await db.select().from(paginatedEmbeds).where(eq(paginatedEmbeds.guildId, guildId));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No paginated embeds in this server.")] });
      const lines = rows.map(r => `\`${r.messageId}\` → <#${r.channelId}> (${r.pages.length} pages)`);
      return ctx.reply({ embeds: [brandEmbed({ title: "Paginated Embeds", description: lines.join("\n") })] });
    }

    return ctx.reply({ embeds: [brandEmbed({ description: "**subcommands:** create, add, update, remove, delete, list" })] });
  },
};
