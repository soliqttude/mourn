import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledCommands } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

function cleanId(value: string) { return value.replace(/[<#@&!>]/g, ""); }
function targetLabel(type: string, id: string) {
  return type === "channel" ? `<#${id}>` : type === "member" ? `<@${id}>` : `<@&${id}>`;
}

export const command: HybridCommand = {
  name: "disablecommand",
  aliases: ["disable", "cmdoff"],
  description: "Disable a command in a channel or for a member or role.",
  usage: "disablecommand [#channel|@member|@role] <command> | disablecommand all <command> | disablecommand list",
  examples: ["disablecommand #general ban", "disablecommand @Member ban", "disablecommand all ban", "disablecommand list"],
  category: "settings",
  permission: "manage_channels",
  guildOnly: true,
  options: [
    { name: "command", description: "Command name, list, or all", type: ApplicationCommandOptionType.String, required: true },
    { name: "target", description: "Channel, member, or role (prefix usage may put target first)", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Channel restriction", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Role restriction", type: ApplicationCommandOptionType.Role, required: false },
    { name: "member", description: "Member restriction", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const positional = [...ctx.args];
    let commandName = (ctx.getString("command") ?? positional[0] ?? "").toLowerCase();
    let rawTarget = ctx.getString("target") ?? positional[1] ?? "";
    if (ctx.source === "prefix" && positional.length >= 2) {
      const first = positional[0] ?? "";
      const second = positional[1] ?? "";
      if (/^(<#|<@|\d{15,25}$)/.test(first)) {
        rawTarget = first;
        commandName = second.toLowerCase();
      }
    }

    if (commandName === "list") {
      const rows = await db.select().from(disabledCommands).where(eq(disabledCommands.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [brandEmbed({ title: "Disabled Commands", description: rows.length
        ? rows.map(r => `**${r.command}** → ${targetLabel(r.targetType, r.targetId)}`).join("\n")
        : "No disabled commands." })] });
    }

    if (commandName === "all") {
      const targetCommand = (ctx.getString("target") ?? positional[1] ?? "").toLowerCase();
      if (!targetCommand) return ctx.reply({ embeds: [errorEmbed("Usage: disablecommand all <command>")] });
      const channels = ctx.guild.channels.cache.filter(ch => ch.isTextBased() && "messages" in ch);
      for (const channel of channels.values()) {
        await db.insert(disabledCommands).values({ guildId: ctx.guild.id, command: targetCommand, targetId: channel.id, targetType: "channel" }).onConflictDoNothing();
      }
      return ctx.reply({ embeds: [successEmbed(`disabled \`${targetCommand}\` in ${channels.size} text channels.`)] });
    }

    if (!commandName) return ctx.reply({ embeds: [errorEmbed("Provide a command name.")] });
    const rawId = cleanId(rawTarget);
    const channel = ctx.getChannel("channel") ?? (rawId ? ctx.guild.channels.cache.get(rawId) : null);
    const role = ctx.getRole("role") ?? (rawId ? ctx.guild.roles.cache.get(rawId) : null);
    const member = await ctx.getMember("member").catch(() => null) ?? (rawId ? await ctx.guild.members.fetch(rawId).catch(() => null) : null);
    const targetId = channel?.id ?? member?.id ?? role?.id;
    const targetType = channel ? "channel" : member ? "member" : role ? "role" : null;
    if (!targetId || !targetType) return ctx.reply({ embeds: [errorEmbed("Provide a channel, member, or role target.")] });

    const where = and(
      eq(disabledCommands.guildId, ctx.guild.id),
      eq(disabledCommands.command, commandName),
      eq(disabledCommands.targetId, targetId),
      eq(disabledCommands.targetType, targetType),
    );
    const existing = await db.select().from(disabledCommands).where(where);
    if (existing.length) {
      await db.delete(disabledCommands).where(where);
      return ctx.reply({ embeds: [successEmbed(`re-enabled \`${commandName}\` for ${targetLabel(targetType, targetId)}.`)] });
    }
    await db.insert(disabledCommands).values({ guildId: ctx.guild.id, command: commandName, targetId, targetType }).onConflictDoNothing();
    return ctx.reply({ embeds: [successEmbed(`\`${commandName}\` disabled for ${targetLabel(targetType, targetId)}.`)] });
  },
};
