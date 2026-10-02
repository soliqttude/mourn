import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { customCommands } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "cc",
  description: "Create a custom command.",
  category: "custom",
  aliases: ["customcommand", "addcc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "name", description: "Command name (trigger)", type: ApplicationCommandOptionType.String, required: true },
    { name: "response", description: "Bot response", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").trim().toLowerCase();
    const response = (ctx.getString("response") ?? ctx.args.slice(1).join(" ")).trim();
    if (!/^[a-z0-9_-]{1,32}$/.test(name)) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("❌ Name must be 1–32 characters and use only letters, numbers, `_` or `-`.")] });
    if (!response) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("❌ Provide a response.")] });
    if (!config.databaseEnabled) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("❌ Custom commands require the database to be enabled.")] });
    const existing = await db.select().from(customCommands).where(and(eq(customCommands.guildId, ctx.guild.id), eq(customCommands.name, name)));
    if (existing.length) return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.errorColor).setDescription("❌ Custom command `" + name + "` already exists.")] });
    await db.insert(customCommands).values({ guildId: ctx.guild.id, name, response, createdBy: ctx.user.id });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.successColor).setTitle("✅ Custom Command Created").addFields({ name: "Trigger", value: "`" + name + "`", inline: true }, { name: "Response", value: response.slice(0, 1000) }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};