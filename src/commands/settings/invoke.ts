import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { invokeMessages } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { invalidateInvokeCache } from "../../features/invokeMessages.js";

const SUPPORTED_COMMANDS = [
  "ban", "kick", "mute", "warn", "timeout", "softban", "hackban", "hardban",
  "jail", "unjail", "unban", "untimeout", "tempban", "imute", "iunmute",
  "rmute", "runmute", "vmute", "vunmute", "strip",
];

export const command: HybridCommand = {
  name: "invoke",
  aliases: ["invokemsg", "invokeresponse"],
  description: "Customize bot response messages when moderation commands are used.",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  usage: "invoke (set|remove|list|variables) [command] [message|dm] [content]",
  examples: [
    "invoke set ban message You have been banned from {guild} by {moderator}",
    "invoke set ban dm {embed}$v{title: Banned}$v{description: You were banned from {guild}}",
    "invoke set kick dm {embed}$v{color: red}$v{description: You were kicked from {guild}.}",
    "invoke remove ban message",
    "invoke list",
    "invoke variables",
  ],
  options: [
    {
      name: "action",
      description: "set, remove, list, or variables",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "set", value: "set" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" },
        { name: "variables", value: "variables" },
      ],
    },
    { name: "command", description: "Mod command e.g. ban, kick, mute", type: ApplicationCommandOptionType.String, required: false },
    {
      name: "type",
      description: "message (channel reply) or dm (DM to target)",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [{ name: "message", value: "message" }, { name: "dm", value: "dm" }],
    },
    { name: "content", description: "The message content (supports embed scripting)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const action = ctx.getString("action") ?? ctx.args[0] ?? "";

    if (action === "variables") {
      return ctx.reply({
        embeds: [brandEmbed({
          description: [
            "**invoke variables**\n",
            "```",
            "{user}              → target username",
            "{user.mention}      → @target",
            "{user.id}           → target user ID",
            "{user.tag}          → target tag",
            "{guild}             → server name",
            "{guild.id}          → server ID",
            "{guild.count}       → member count",
            "{moderator}         → moderator username",
            "{moderator.mention} → @moderator",
            "{moderator.id}      → moderator ID",
            "{channel}           → channel mention",
            "{reason}            → action reason",
            "{duration}          → action duration",
            "```\n",
            "**embed scripting:**",
            "```",
            "{embed}$v{title: Banned from {guild}}$v{color: red}$v{description: You were banned.}",
            "```\n",
            "**conditionals:**",
            "```",
            "{if:{reason}==no reason provided}",
            "  No reason was given.",
            "{else}",
            "  Reason: {reason}",
            "{/if}",
            "```",
          ].join("\n"),
        })],
      });
    }

    if (action === "list") {
      const rows = await db.select().from(invokeMessages).where(eq(invokeMessages.guildId, guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No invoke messages configured.")] });
      const lines = rows.map(r => {
        const preview = r.content.length > 45 ? r.content.slice(0, 45) + "…" : r.content;
        return `**${r.command}** (${r.type}) — \`${preview}\``;
      });
      return ctx.reply({
        embeds: [brandEmbed({ description: `**invoke messages (${rows.length})**\n\n${lines.join("\n")}` })],
      });
    }

    // Bleed-compatible shorthand: invoke <command> <message|dm> [view|content].
    // The original VILLAIN form (invoke set|remove <command> <type> ...) remains supported.
    const directCommand = !["set", "remove", "list", "variables"].includes(action.toLowerCase());
    if (directCommand) {
      const cmdName = action.toLowerCase();
      if (!SUPPORTED_COMMANDS.includes(cmdName)) return ctx.reply({ embeds: [errorEmbed(`unsupported command.\\nsupported: \`${SUPPORTED_COMMANDS.join(", ")}\``)] });
      const type = (ctx.args[1] ?? "").toLowerCase();
      if (!["message", "dm"].includes(type)) return ctx.reply({ embeds: [errorEmbed("Specify `message` or `dm`.")] });
      const tail = ctx.args.slice(2);
      if (tail[0]?.toLowerCase() === "view") {
        const rows = await db.select().from(invokeMessages).where(and(eq(invokeMessages.guildId, guild.id), eq(invokeMessages.command, cmdName), eq(invokeMessages.type, type)));
        if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`No invoke ${type} configured for \`${cmdName}\`.`)] });
        return ctx.reply({ embeds: [brandEmbed({ title: `invoke ${cmdName} ${type}`, description: rows[0]!.content.slice(0, 4000) })] });
      }
      const content = tail.join(" ");
      if (!content) return ctx.reply({ embeds: [errorEmbed("Provide content, or use `view` to inspect the current response.")] });
      await db.insert(invokeMessages).values({ guildId: guild.id, command: cmdName, type, content })
        .onConflictDoUpdate({ target: [invokeMessages.guildId, invokeMessages.command, invokeMessages.type], set: { content } });
      invalidateInvokeCache(guild.id);
      return ctx.reply({ embeds: [successEmbed(`invoke ${type} for \`${cmdName}\` set.`)] });
    }

    const cmdName = (ctx.getString("command") ?? ctx.args[1] ?? "").toLowerCase();
    if (!cmdName) return ctx.reply({ embeds: [errorEmbed(`specify a command.\nsupported: \`${SUPPORTED_COMMANDS.join(", ")}\``)] });
    if (!SUPPORTED_COMMANDS.includes(cmdName)) return ctx.reply({ embeds: [errorEmbed(`unsupported command.\nsupported: \`${SUPPORTED_COMMANDS.join(", ")}\``)] });

    const type = ctx.getString("type") ?? ctx.args[2] ?? "";
    if (!type || !["message", "dm"].includes(type)) return ctx.reply({ embeds: [errorEmbed("Specify type: `message` or `dm`.")] });

    if (action === "remove") {
      await db.delete(invokeMessages).where(and(eq(invokeMessages.guildId, guild.id), eq(invokeMessages.command, cmdName), eq(invokeMessages.type, type)));
      invalidateInvokeCache(guild.id);
      return ctx.reply({ embeds: [successEmbed(`removed invoke ${type} for \`${cmdName}\`.`)] });
    }

    if (action === "set") {
      const content = ctx.rawArgs
        ? ctx.rawArgs.split(" ").slice(2).join(" ")
        : (ctx.getString("content") ?? "");
      if (!content) return ctx.reply({ embeds: [errorEmbed("Provide the message content.")] });
      await db.insert(invokeMessages).values({ guildId: guild.id, command: cmdName, type, content })
        .onConflictDoUpdate({
          target: [invokeMessages.guildId, invokeMessages.command, invokeMessages.type],
          set: { content },
        });
      invalidateInvokeCache(guild.id);
      return ctx.reply({ embeds: [successEmbed(`invoke ${type} for \`${cmdName}\` set.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Invalid action.")] });
  },
};
