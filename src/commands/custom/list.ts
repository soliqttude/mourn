import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { customCommands } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "cclist",
  description: "List all custom commands.",
  category: "custom",
  aliases: ["customlist", "listcc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  async execute(ctx) {
    if (!ctx.guild) return;
    if (!config.databaseEnabled) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("❌ Custom commands require the database to be enabled.")] });
    const rows = await db.select().from(customCommands).where(eq(customCommands.guildId, ctx.guild.id));
    if (!rows.length) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.brandColor).setTitle("⚙️ Custom Commands").setDescription("No custom commands set up yet. Use `cc <name> <response>` to create one.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    const description = rows.slice(0, 50).map((r, i) => "**" + (i + 1) + ".** `" + r.name + "` — " + r.response.slice(0, 120)).join("\n");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.brandColor).setTitle("⚙️ Custom Commands (" + rows.length + ")").setDescription(description).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};