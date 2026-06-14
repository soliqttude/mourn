import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledCommands } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "disablecommand",
  aliases: ["disable", "cmdoff"],
  description: "Disable a command in a specific channel or for a role.",
  usage: "disablecommand <command> [#channel|@role] | disablecommand list | disablecommand reset",
  examples: [
    "disablecommand ban #general",
    "disablecommand warn @Members",
    "disablecommand list",
    "disablecommand reset ban #general",
  ],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "command", description: "Command name, list, or reset", type: ApplicationCommandOptionType.String, required: true },
    { name: "target", description: "Channel or role to restrict in", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Channel to restrict in", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Role to restrict for", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const cmdArg = (ctx.getString("command") ?? ctx.args[0] ?? "").toLowerCase();

    if (cmdArg === "list") {
      const rows = await db.select().from(disabledCommands).where(eq(disabledCommands.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No disabled **commands**.")] });
      const lines = rows.map(r => `**${r.command}** → ${r.targetType === "channel" ? `<#${r.targetId}>` : `<@&${r.targetId}>`}`);
      return ctx.reply({ embeds: [brandEmbed({ title: "disabled commands", description: lines.join("\n") })] });
    }

    if (cmdArg === "reset") {
      const specificCmd = (ctx.args[1] ?? "").toLowerCase();
      if (specificCmd) {
        const targetStr = ctx.args[2] ?? "";
        const targetId = targetStr.replace(/[<#@&!>]/g, "");
        if (targetId) {
          await db.delete(disabledCommands).where(and(eq(disabledCommands.guildId, ctx.guild.id), eq(disabledCommands.command, specificCmd), eq(disabledCommands.targetId, targetId)));
          return ctx.reply({ embeds: [successEmbed(`re-enabled \`${specificCmd}\` for that target.`)] });
        }
      }
      await db.delete(disabledCommands).where(eq(disabledCommands.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [successEmbed("All **command** restrictions cleared.")] });
    }

    const targetStr = ctx.getString("target") ?? ctx.args[1] ?? "";
    const rawId = targetStr.replace(/[<#@&!>]/g, "");
    let targetId: string | null = null;
    let targetType: "channel" | "role" = "channel";

    const ch = ctx.getChannel("channel") ?? (rawId ? ctx.guild.channels.cache.get(rawId) : null);
    const role = ctx.getRole("role") ?? (rawId ? ctx.guild.roles.cache.get(rawId) : null);

    if (ch) { targetId = ch.id; targetType = "channel"; }
    else if (role) { targetId = role.id; targetType = "role"; }
    else if (rawId) {
      // try channel first, then role
      const foundCh = ctx.guild.channels.cache.get(rawId);
      const foundRole = ctx.guild.roles.cache.get(rawId);
      if (foundCh) { targetId = foundCh.id; targetType = "channel"; }
      else if (foundRole) { targetId = foundRole.id; targetType = "role"; }
    }

    if (!targetId) return ctx.reply({ embeds: [errorEmbed("Provide a **channel** or **role** to disable this **command** for.")] });

    // Toggle behavior
    const existing = await db.select().from(disabledCommands).where(and(
      eq(disabledCommands.guildId, ctx.guild.id),
      eq(disabledCommands.command, cmdArg),
      eq(disabledCommands.targetId, targetId),
    ));

    if (existing.length) {
      await db.delete(disabledCommands).where(and(
        eq(disabledCommands.guildId, ctx.guild.id),
        eq(disabledCommands.command, cmdArg),
        eq(disabledCommands.targetId, targetId),
      ));
      return ctx.reply({ embeds: [successEmbed(`re-enabled \`${cmdArg}\` for that ${targetType}.`)] });
    }

    await db.insert(disabledCommands).values({
      guildId: ctx.guild.id, command: cmdArg, targetId, targetType,
    }).onConflictDoNothing();
    return ctx.reply({ embeds: [successEmbed(`\`${cmdArg}\` disabled for ${targetType === "channel" ? `<#${targetId}>` : `<@&${targetId}>`}.`)] });
  },
};
