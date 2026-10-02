import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { customCommands } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "ccdelete",
  description: "Delete a custom command.",
  category: "custom",
  aliases: ["removecc", "deletecc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "name", description: "Command name to delete", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").trim().toLowerCase();
    if (!config.databaseEnabled) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("❌ Custom commands require the database to be enabled.")] });
    const existing = await db.select().from(customCommands).where(and(eq(customCommands.guildId, ctx.guild.id), eq(customCommands.name, name)));
    if (!existing.length) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("❌ Custom command `" + name + "` was not found.")] });
    await db.delete(customCommands).where(and(eq(customCommands.guildId, ctx.guild.id), eq(customCommands.name, name)));
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.successColor).setDescription("✅ Custom command `" + name + "` deleted.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};