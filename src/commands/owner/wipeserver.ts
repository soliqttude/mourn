import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { guildSettings, economy, levels, warnings, modCases, tags, autoresponders, tickets, giveaways, wordFilter, modNotes, shopItems, userItems, reports } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "wipeserver",
  description: "(Owner only) Wipe ALL bot data for a server.",
  usage: "wipeserver [guild_id] [confirm]",
  examples: ["wipeserver"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID to wipe", type: ApplicationCommandOptionType.String, required: true },
    { name: "confirm", description: "Type CONFIRM to proceed", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const guildId = ctx.getString("guild_id", true) ?? ctx.args[0];
    const confirm = ctx.getString("confirm") ?? ctx.args[1];
    if (confirm !== "CONFIRM") return ctx.reply({ content: "Type exactly `CONFIRM` to proceed." });
    if (!guildId) return ctx.reply({ content: "Provide a guild ID." });
    await ctx.defer(true);
    const tables = [economy, levels, warnings, modCases, tags, autoresponders, tickets, giveaways, wordFilter, modNotes, shopItems, userItems, reports, guildSettings];
    let wiped = 0;
    for (const table of tables) {
      try { await db.delete(table as any).where(eq((table as any).guildId, guildId)); wiped++; } catch { }
    }
    const eb = new EmbedBuilder()
      .setColor(config.errorColor)
      .setTitle("🗑️ Server Wiped")
      .setDescription(`All bot data for guild \`${guildId}\` deleted.\n**${wiped}** tables cleared.`)
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb] });
  },
};
