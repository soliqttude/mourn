import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledCommands } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

function cleanId(value: string) { return value.replace(/[<#@&!>]/g, ""); }

export const command: HybridCommand = {
  name: "enablecommand",
  aliases: ["enable", "cmdon"],
  description: "Re-enable a command in a channel or for a member or role.",
  usage: "enablecommand [#channel|@member|@role] <command> | enablecommand all <command>",
  examples: ["enablecommand #general ban", "enablecommand @Member ban", "enablecommand all ban"],
  category: "settings",
  permission: "manage_channels",
  guildOnly: true,
  options: [
    { name: "command", description: "Command name or all", type: ApplicationCommandOptionType.String, required: true },
    { name: "target", description: "Channel, member, or role", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Role", type: ApplicationCommandOptionType.Role, required: false },
    { name: "member", description: "Member", type: ApplicationCommandOptionType.User, required: false },
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
    if (!commandName) return ctx.reply({ embeds: [errorEmbed("Provide a command name.")] });
    if (commandName === "all") {
      const targetCommand = (ctx.getString("target") ?? positional[1] ?? "").toLowerCase();
      if (!targetCommand) return ctx.reply({ embeds: [errorEmbed("Usage: enablecommand all <command>")] });
      await db.delete(disabledCommands).where(and(eq(disabledCommands.guildId, ctx.guild.id), eq(disabledCommands.command, targetCommand)));
      return ctx.reply({ embeds: [successEmbed(`re-enabled \`${targetCommand}\` in every channel.`)] });
    }

    const rawId = cleanId(rawTarget);
    const channel = ctx.getChannel("channel") ?? (rawId ? ctx.guild.channels.cache.get(rawId) : null);
    const role = ctx.getRole("role") ?? (rawId ? ctx.guild.roles.cache.get(rawId) : null);
    const member = await ctx.getMember("member").catch(() => null) ?? (rawId ? await ctx.guild.members.fetch(rawId).catch(() => null) : null);
    const targetId = channel?.id ?? member?.id ?? role?.id;
    const targetType = channel ? "channel" : member ? "member" : role ? "role" : null;
    if (!targetId || !targetType) return ctx.reply({ embeds: [errorEmbed("Provide a channel, member, or role target.")] });
    await db.delete(disabledCommands).where(and(
      eq(disabledCommands.guildId, ctx.guild.id),
      eq(disabledCommands.command, commandName),
      eq(disabledCommands.targetId, targetId),
      eq(disabledCommands.targetType, targetType),
    ));
    return ctx.reply({ embeds: [successEmbed(`\`${commandName}\` re-enabled for the selected target.`)] });
  },
};
