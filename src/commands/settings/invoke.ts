import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { invokeMessages } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { invalidateInvokeCache } from "../../features/invokeMessages.js";

const MESSAGE_COMMANDS = ["unmute", "kick", "tempban", "unban", "softban", "jail", "untimeout", "iunmute", "mute", "ban", "imute", "unjail", "warn", "rmute", "runmute", "hardban", "timeout"];
const DM_COMMANDS = ["unmute", "kick", "tempban", "unban", "softban", "jail", "untimeout", "mute", "ban", "unjail", "warn", "hardban", "timeout"];

export const command: HybridCommand = {
  name: "invoke",
  aliases: ["invokemsg", "invokeresponse"],
  description: "Customize moderation command response and DM messages.",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  usage: "invoke <command> <message|dm> [message|view]",
  examples: ["invoke ban message You were banned.", "invoke ban dm You were banned.", "invoke ban message view"],
  options: [
    { name: "action", description: "Moderation command or legacy action", type: ApplicationCommandOptionType.String, required: true },
    { name: "type", description: "message or dm", type: ApplicationCommandOptionType.String, required: false, choices: [{ name: "message", value: "message" }, { name: "dm", value: "dm" }] },
    { name: "content", description: "Response text or embed script", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const args = ctx.args;
    const action = (ctx.getString("action") ?? args[0] ?? "").toLowerCase();
    const legacy = ["set", "remove", "list", "variables"].includes(action);
    if (action === "list") {
      const rows = await db.select().from(invokeMessages).where(eq(invokeMessages.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No invoke messages configured.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Invoke Messages", description: rows.map(r => "**" + r.command + "** (" + r.type + ") — " + r.content.slice(0, 70)).join("\n") })] });
    }
    if (action === "variables") return ctx.reply({ embeds: [brandEmbed({ title: "Invoke Variables", description: "{user}, {user.mention}, {user.id}, {user.tag}, {guild}, {guild.id}, {guild.count}, {moderator}, {moderator.mention}, {moderator.id}, {channel}, {reason}, {duration}. Embed scripting is supported." })] });
    let commandName = action;
    let type = (ctx.getString("type") ?? args[1] ?? "").toLowerCase();
    let body = ctx.getString("content") ?? "";
    if (legacy) { commandName = (args[1] ?? "").toLowerCase(); type = (args[2] ?? "").toLowerCase(); body = args.slice(3).join(" ") || body; }
    if (!legacy && !type) {
      if (!MESSAGE_COMMANDS.includes(commandName)) return ctx.reply({ embeds: [errorEmbed("Unknown invoke command. Supported: " + MESSAGE_COMMANDS.join(", "))] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Invoke: " + commandName, description: "Set a response with invoke " + commandName + " message <text>" + (DM_COMMANDS.includes(commandName) ? " or invoke " + commandName + " dm <text>" : "") + ". Add view to display the current message." })] });
    }
    if (!MESSAGE_COMMANDS.includes(commandName)) return ctx.reply({ embeds: [errorEmbed("Unsupported command. Supported: " + MESSAGE_COMMANDS.join(", "))] });
    if (type !== "message" && type !== "dm") return ctx.reply({ embeds: [errorEmbed("Specify message or dm.")] });
    if (type === "dm" && !DM_COMMANDS.includes(commandName)) return ctx.reply({ embeds: [errorEmbed("DM messages are not supported for " + commandName + ".")] });
    const tail = legacy ? args.slice(4) : args.slice(2);
    const view = tail[0]?.toLowerCase() === "view" || body.toLowerCase() === "view";
    if (action === "remove" || action === "reset") {
      await db.delete(invokeMessages).where(and(eq(invokeMessages.guildId, ctx.guild.id), eq(invokeMessages.command, commandName), eq(invokeMessages.type, type)));
      invalidateInvokeCache(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed("Reset the " + type + " invoke message for " + commandName + ".")] });
    }
    if (view) {
      const [row] = await db.select().from(invokeMessages).where(and(eq(invokeMessages.guildId, ctx.guild.id), eq(invokeMessages.command, commandName), eq(invokeMessages.type, type)));
      return ctx.reply({ embeds: [row ? brandEmbed({ title: commandName + " — " + type, description: row.content.slice(0, 4000) }) : errorEmbed("No " + type + " invoke message is configured for " + commandName + ".")] });
    }
    if (legacy && action !== "set") return ctx.reply({ embeds: [errorEmbed("Use invoke <command> <message|dm> [view].")] });
    if (!body) body = tail.join(" ");
    if (!body) return ctx.reply({ embeds: [errorEmbed("Provide a message, or add view to display the current one.")] });
    await db.insert(invokeMessages).values({ guildId: ctx.guild.id, command: commandName, type, content: body }).onConflictDoUpdate({ target: [invokeMessages.guildId, invokeMessages.command, invokeMessages.type], set: { content: body } });
    invalidateInvokeCache(ctx.guild.id);
    return ctx.reply({ embeds: [successEmbed("Updated the " + type + " invoke message for " + commandName + ".")] });
  },
};
