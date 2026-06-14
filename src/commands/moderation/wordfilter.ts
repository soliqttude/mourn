import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { wordFilter } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "wordfilter",
  aliases: ["filter", "wf", "badwords"],
  description: "Manage the server word filter.",
  usage: "wordfilter [action] [word]",
  examples: ["wordfilter"],
  category: "moderation",
  permission: "manage_messages",
  guildOnly: true,
  options: [
    { name: "action", description: "add · remove · list", type: ApplicationCommandOptionType.String, required: true },
    { name: "word", description: "Word to add or remove", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const action = (ctx.getString("action", true) ?? ctx.args[0] ?? "").toLowerCase();
    const word = (ctx.getString("word") ?? ctx.args[1] ?? "").toLowerCase().trim();

    if (action === "add") {
      if (!word) return ctx.reply({ embeds: [errorEmbed("Please provide a **word**.")] });
      await db.insert(wordFilter).values({ guildId: guild.id, word }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`Added **${word}** to the word filter.`)] });
    }

    if (action === "remove") {
      if (!word) return ctx.reply({ embeds: [errorEmbed("Please provide a **word**.")] });
      await db.delete(wordFilter).where(and(eq(wordFilter.guildId, guild.id), eq(wordFilter.word, word)));
      return ctx.reply({ embeds: [successEmbed(`Removed **${word}** from the word filter.`)] });
    }

    if (action === "list") {
      const words = await db.select().from(wordFilter).where(eq(wordFilter.guildId, guild.id));
      if (words.length === 0) return ctx.reply({ embeds: [brandEmbed({ title: "Word Filter", description: "No filtered words yet.", page: "Moderation" })] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Word Filter", description: words.map((w) => `\`${w.word}\``).join(", "), page: "Moderation" })] });
    }

    return ctx.reply({ embeds: [errorEmbed("Usage: `/wordfilter add/remove/list`")] });
  },
};
