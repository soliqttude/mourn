import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledCommands } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "enablecommand",
  aliases: ["enable", "cmdon"],
  description: "Re-enable a previously disabled command.",
  usage: "enablecommand <command> [#channel|@role]",
  examples: ["enablecommand ban #general", "enablecommand warn @Members"],
  category: "settings",
  permission: "manage_channels",
  guildOnly: true,

  options: [
    { name: "command", description: "Command to re-enable", type: ApplicationCommandOptionType.String, required: true },
    { name: "target", description: "Channel or role ID", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Role", type: ApplicationCommandOptionType.Role, required: false },
    { name: "member", description: "Member", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const cmdArg = (ctx.getString("command") ?? ctx.args[0] ?? "").toLowerCase();
    if (cmdArg === "all") {
      const commandName = (ctx.args[1] ?? ctx.getString("target") ?? "").toLowerCase();
      if (!commandName) return ctx.reply({ embeds: [errorEmbed("Usage: enablecommand all <command>")] });
      await db.delete(disabledCommands).where(and(eq(disabledCommands.guildId, ctx.guild.id), eq(disabledCommands.command, commandName)));
      return ctx.reply({ embeds: [successEmbed(`re-enabled \`${commandName}\` in every channel.`)] });
    }
    const targetStr = ctx.getString("target") ?? ctx.args[1] ?? "";
    const rawId = targetStr.replace(/[<#@&!>]/g, "");
    const ch = ctx.getChannel("channel") ?? (rawId ? ctx.guild.channels.cache.get(rawId) : null);
    const role = ctx.getRole("role") ?? (rawId ? ctx.guild.roles.cache.get(rawId) : null);
    const member = await ctx.getMember("member").catch(() => null) ?? (rawId ? await ctx.guild.members.fetch(rawId).catch(() => null) : null);
    const targetId = ch?.id ?? role?.id ?? member?.id ?? null;

    const conditions: any[] = [eq(disabledCommands.guildId, ctx.guild.id), eq(disabledCommands.command, cmdArg)];
    if (targetId) conditions.push(eq(disabledCommands.targetId, targetId));
    await db.delete(disabledCommands).where(and(...conditions));
    return ctx.reply({ embeds: [successEmbed(`\`${cmdArg}\` ${targetId ? "re-enabled for that target" : "re-enabled everywhere"}.`)] });
  },
};
