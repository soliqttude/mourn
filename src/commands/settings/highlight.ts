import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { highlights } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "highlight",
  description: "Get DM'd when a keyword is mentioned.",
  category: "utility",
  guildOnly: true,
  aliases: ["hl"],
  options: [
    {
      name: "add", description: "Add a highlight keyword", type: ApplicationCommandOptionType.Subcommand,
      options: [{ name: "keyword", description: "Keyword to highlight", type: ApplicationCommandOptionType.String, required: true }],
    },
    {
      name: "remove", description: "Remove a highlight keyword", type: ApplicationCommandOptionType.Subcommand,
      options: [{ name: "keyword", description: "Keyword to remove", type: ApplicationCommandOptionType.String, required: true }],
    },
    { name: "list", description: "List your highlights", type: ApplicationCommandOptionType.Subcommand },
    { name: "clear", description: "Clear all your highlights", type: ApplicationCommandOptionType.Subcommand },
  ] as any,
  async execute(ctx) {
    if (!ctx.guild) return;
    const interaction = ctx.raw as any;
    const subName = ctx.source === "slash" ? interaction.options?.getSubcommand?.() : ctx.args[0];
    const keyword = ctx.source === "slash" ? interaction.options?.getString?.("keyword") : ctx.args[1];

    if (subName === "add") {
      if (!keyword) return ctx.reply({ embeds: [errorEmbed("Provide a keyword.")] });
      const existing = await db.select().from(highlights).where(and(eq(highlights.userId, ctx.user.id), eq(highlights.guildId, ctx.guild.id)));
      if (existing.length >= 10) return ctx.reply({ embeds: [errorEmbed("You can only have up to 10 highlights.")] });
      if (existing.some(h => h.keyword.toLowerCase() === keyword.toLowerCase())) return ctx.reply({ embeds: [errorEmbed("You already have that highlight.")] });
      await db.insert(highlights).values({ userId: ctx.user.id, guildId: ctx.guild.id, keyword: keyword.toLowerCase() });
      return ctx.reply({ embeds: [successEmbed(`Added **${keyword}** to your highlights.`)] });
    }

    if (subName === "remove") {
      if (!keyword) return ctx.reply({ embeds: [errorEmbed("Provide a keyword.")] });
      await db.delete(highlights).where(and(eq(highlights.userId, ctx.user.id), eq(highlights.guildId, ctx.guild.id), eq(highlights.keyword, keyword.toLowerCase())));
      return ctx.reply({ embeds: [successEmbed(`Removed **${keyword}** from your highlights.`)] });
    }

    if (subName === "clear") {
      await db.delete(highlights).where(and(eq(highlights.userId, ctx.user.id), eq(highlights.guildId, ctx.guild.id)));
      return ctx.reply({ embeds: [successEmbed("Cleared all your highlights.")] });
    }

    const rows = await db.select().from(highlights).where(and(eq(highlights.userId, ctx.user.id), eq(highlights.guildId, ctx.guild.id)));
    if (!rows.length) return ctx.reply({ embeds: [brandEmbed({ title: "Your Highlights", description: "None set. Use `/highlight add <keyword>`.", page: "Utility" })] });
    return ctx.reply({ embeds: [brandEmbed({ title: "Your Highlights", description: rows.map(h => `• ${h.keyword}`).join("\n"), page: "Utility" })] });
  },
};
