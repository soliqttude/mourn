import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { wordFilter } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "wordfilter",
  description: "Manage the server word filter.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "add", description: "Add a word to the filter", type: ApplicationCommandOptionType.Subcommand, options: [{ name: "word", description: "Word to block", type: ApplicationCommandOptionType.String, required: true }] } as any,
    { name: "remove", description: "Remove a word from the filter", type: ApplicationCommandOptionType.Subcommand, options: [{ name: "word", description: "Word to remove", type: ApplicationCommandOptionType.String, required: true }] } as any,
    { name: "list", description: "List all filtered words", type: ApplicationCommandOptionType.Subcommand } as any,
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = ctx.getString("subcommand") ?? ctx.args[0];
    const word = (ctx.getString("word") ?? ctx.args[1] ?? "").toLowerCase().trim();

    if (sub === "add") {
      if (!word) return ctx.reply({ embeds: [errorEmbed("Please provide a word.")] });
      await db.insert(wordFilter).values({ guildId: ctx.guild.id, word }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`Added **${word}** to the word filter.`)] });
    }

    if (sub === "remove") {
      if (!word) return ctx.reply({ embeds: [errorEmbed("Please provide a word.")] });
      await db.delete(wordFilter).where(and(eq(wordFilter.guildId, ctx.guild.id), eq(wordFilter.word, word)));
      return ctx.reply({ embeds: [successEmbed(`Removed **${word}** from the word filter.`)] });
    }

    const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, ctx.guild.id));
    if (words.length === 0) return ctx.reply({ embeds: [brandEmbed({ title: "Word Filter", description: "No words in the filter yet.", page: "Moderation" })] });
    return ctx.reply({
      embeds: [brandEmbed({ title: "Word Filter", description: words.map((w) => `\`${w.word}\``).join(", "), page: "Moderation" })],
    });
  },
};
