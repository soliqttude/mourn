import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledCommands } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "disablecommand",
  aliases: ["disablecmd"],
  description: "Disable a command in a channel or for a member.",
  usage: "disablecommand <channel|member|all> <command>",
  examples: ["disablecommand #general ban", "disablecommand all meme", "disablecommand list"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "target", description: "Channel, member mention, 'all', or 'list'", type: ApplicationCommandOptionType.String, required: true },
    { name: "command", description: "Command name to disable", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rawTarget = (ctx.getString("target") ?? ctx.args[0] ?? "").toLowerCase();
    const cmdName = (ctx.getString("command") ?? ctx.args[1] ?? "").toLowerCase();

    if (rawTarget === "list") {
      const rows = await db.select().from(disabledCommands).where(eq(disabledCommands.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no disabled commands.")] });
      const grouped: Record<string, string[]> = {};
      for (const r of rows) {
        const key = r.targetType === "channel" ? `<#${r.targetId}>` : `<@${r.targetId}>`;
        (grouped[key] ??= []).push(`\`${r.command}\``);
      }
      const lines = Object.entries(grouped).map(([k, v]) => `${k}: ${v.join(", ")}`);
      return ctx.reply({ embeds: [{ title: "Disabled Commands", description: lines.join("\n"), color: 0x111116 } as any] });
    }

    if (!cmdName) return ctx.reply({ embeds: [errorEmbed("please provide a command name.")] });

    if (rawTarget === "all") {
      const channels = ctx.guild.channels.cache.filter(c => c.isTextBased());
      for (const [, ch] of channels) {
        await db.insert(disabledCommands).values({ guildId: ctx.guild.id, targetId: ch.id, targetType: "channel", command: cmdName }).onConflictDoNothing();
      }
      return ctx.reply({ embeds: [successEmbed(`\`${cmdName}\` disabled in all channels.`)] });
    }

    const targetId = rawTarget.replace(/[<#@!>]/g, "");
    const targetType = rawTarget.startsWith("<#") || ctx.guild.channels.cache.has(targetId) ? "channel" : "member";
    await db.insert(disabledCommands).values({ guildId: ctx.guild.id, targetId, targetType, command: cmdName }).onConflictDoNothing();
    return ctx.reply({ embeds: [successEmbed(`\`${cmdName}\` disabled for <#${targetId}>.`)] });
  },
};
