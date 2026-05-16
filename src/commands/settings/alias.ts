import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { commandAliases } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { findCommand } from "../../handlers/registry.js";

export const command: HybridCommand = {
  name: "alias",
  aliases: ["cmdalias", "commandalias"],
  description: "Create custom command aliases — shorthand names for existing commands in this server.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "alias (add|remove|list|view) [alias] [command]",
  examples: [
    "alias add pb purge",
    "alias add cls purge",
    "alias view pb",
    "alias list",
    "alias remove pb",
  ],
  options: [
    {
      name: "action",
      description: "add, remove, list, or view",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" },
        { name: "view", value: "view" },
      ],
    },
    { name: "alias", description: "The alias name", type: ApplicationCommandOptionType.String, required: false },
    { name: "command", description: "The command it maps to", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const action = ctx.getString("action");

    if (action === "list") {
      const rows = await db.select().from(commandAliases).where(eq(commandAliases.guildId, guild.id));
      if (!rows.length)
        return ctx.reply({ embeds: [errorEmbed("no aliases configured for this server.")] });

      const sorted = rows.sort((a, b) => a.alias.localeCompare(b.alias));
      const maxLen = Math.max(...sorted.map((r) => r.alias.length));
      const lines = sorted.map((r) => `${r.alias.padEnd(maxLen + 2)}→  ${r.command}`);
      return ctx.reply({
        embeds: [brandEmbed({
          description: `**server aliases (${rows.length})**\n\`\`\`\n${lines.join("\n")}\n\`\`\``,
          page: "settings",
        })],
      });
    }

    const aliasName = ctx.getString("alias")?.toLowerCase();
    if (!aliasName) return ctx.reply({ embeds: [errorEmbed("please provide an alias name.")] });

    if (action === "view") {
      const rows = await db.select().from(commandAliases)
        .where(and(eq(commandAliases.guildId, guild.id), eq(commandAliases.alias, aliasName)));
      if (!rows.length)
        return ctx.reply({ embeds: [errorEmbed(`no alias \`${aliasName}\` found.`)] });
      return ctx.reply({
        embeds: [brandEmbed({
          description: `**alias \`${aliasName}\`**\nmaps to \`${rows[0].command}\``,
          page: "settings",
        })],
      });
    }

    if (action === "remove") {
      const rows = await db.select().from(commandAliases)
        .where(and(eq(commandAliases.guildId, guild.id), eq(commandAliases.alias, aliasName)));
      if (!rows.length)
        return ctx.reply({ embeds: [errorEmbed(`no alias \`${aliasName}\` found.`)] });
      await db.delete(commandAliases)
        .where(and(eq(commandAliases.guildId, guild.id), eq(commandAliases.alias, aliasName)));
      return ctx.reply({ embeds: [successEmbed(`removed alias \`${aliasName}\`.`, "settings")] });
    }

    if (action === "add") {
      const cmdName = ctx.getString("command")?.toLowerCase();
      if (!cmdName) return ctx.reply({ embeds: [errorEmbed("please provide the command name to map to.")] });

      const cmd = findCommand(cmdName);
      if (!cmd || cmd.ownerOnly)
        return ctx.reply({ embeds: [errorEmbed(`command \`${cmdName}\` not found.`)] });

      if (findCommand(aliasName))
        return ctx.reply({ embeds: [errorEmbed(`\`${aliasName}\` is already a built-in command name.`)] });

      const existing = await db.select().from(commandAliases)
        .where(and(eq(commandAliases.guildId, guild.id), eq(commandAliases.alias, aliasName)));
      if (existing.length)
        return ctx.reply({ embeds: [errorEmbed(`alias \`${aliasName}\` already exists — remove it first.`)] });

      const all = await db.select().from(commandAliases).where(eq(commandAliases.guildId, guild.id));
      if (all.length >= 50)
        return ctx.reply({ embeds: [errorEmbed("maximum of 50 aliases per server.")] });

      await db.insert(commandAliases).values({ guildId: guild.id, alias: aliasName, command: cmd.name });
      return ctx.reply({ embeds: [successEmbed(`alias \`${aliasName}\` → \`${cmd.name}\` created.`, "settings")] });
    }

    return ctx.reply({ embeds: [errorEmbed("invalid action.")] });
  },
};
