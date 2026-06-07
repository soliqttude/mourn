import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledCommands } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "enablecommand",
  aliases: ["enablecmd"],
  description: "Re-enable a previously disabled command in a channel or for a member.",
  usage: "enablecommand <channel|member|all> <command>",
  examples: ["enablecommand #general ban", "enablecommand all ban"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "target", description: "Channel, member mention, or 'all'", type: ApplicationCommandOptionType.String, required: true },
    { name: "command", description: "Command name to enable", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rawTarget = ctx.getString("target") ?? ctx.args[0] ?? "";
    const cmdName = (ctx.getString("command") ?? ctx.args[1] ?? "").toLowerCase();
    if (!cmdName) return ctx.reply({ embeds: [errorEmbed("please provide a command name.")] });

    if (rawTarget === "all") {
      await db.delete(disabledCommands).where(and(eq(disabledCommands.guildId, ctx.guild.id), eq(disabledCommands.command, cmdName)));
      return ctx.reply({ embeds: [successEmbed(`\`${cmdName}\` enabled in all channels.`)] });
    }

    const targetId = rawTarget.replace(/[<#@!>]/g, "");
    await db.delete(disabledCommands).where(and(eq(disabledCommands.guildId, ctx.guild.id), eq(disabledCommands.targetId, targetId), eq(disabledCommands.command, cmdName)));
    return ctx.reply({ embeds: [successEmbed(`\`${cmdName}\` enabled for <#${targetId}>.`)] });
  },
};
