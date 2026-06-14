import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { globalIgnores } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "ignore",
  aliases: ["botignore"],
  description: "Make the bot ignore a member or channel entirely.",
  usage: "ignore <add|remove|list> [member or channel]",
  examples: ["ignore add @user", "ignore add #channel", "ignore remove @user", "ignore list"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | list", type: ApplicationCommandOptionType.String, required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }] },
    { name: "target", description: "Member or channel to ignore", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    if (sub === "list") {
      const rows = await db.select().from(globalIgnores).where(eq(globalIgnores.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No ignored **members** or **channels**.")] });
      const lines = rows.map(r => r.targetType === "channel" ? `<#${r.targetId}>` : `<@${r.targetId}>`);
      return ctx.reply({ embeds: [brandEmbed({ title: "Ignored Targets", description: lines.join("\n") })] });
    }

    const rawTarget = ctx.getString("target") ?? ctx.args[1] ?? "";
    const channelMatch = rawTarget.match(/^<#(\d+)>$/) ?? rawTarget.match(/^(\d{17,20})$/);
    const memberMatch = rawTarget.match(/^<@!?(\d+)>$/);
    let targetId: string, targetType: "member" | "channel";

    if (memberMatch) {
      targetId = memberMatch[1]!;
      targetType = "member";
    } else if (rawTarget.startsWith("<#") || (channelMatch && ctx.guild.channels.cache.has(channelMatch[1]!))) {
      targetId = (rawTarget.match(/(\d{17,20})/) ?? [])[1] ?? "";
      targetType = "channel";
    } else if (channelMatch) {
      targetId = channelMatch[1]!;
      // guess type by looking up cache
      targetType = ctx.guild.channels.cache.has(targetId) ? "channel" : "member";
    } else {
      return ctx.reply({ embeds: [errorEmbed("Please mention a valid **member** or **channel**.")] });
    }

    if (!targetId) return ctx.reply({ embeds: [errorEmbed("Couldn't resolve that target.")] });

    if (sub === "add") {
      await db.insert(globalIgnores).values({ guildId: ctx.guild.id, targetId, targetType }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`now ignoring ${targetType === "channel" ? `<#${targetId}>` : `<@${targetId}>`}.`)] });
    }

    if (sub === "remove") {
      await db.delete(globalIgnores).where(and(eq(globalIgnores.guildId, ctx.guild.id), eq(globalIgnores.targetId, targetId)));
      return ctx.reply({ embeds: [successEmbed(`removed ignore for ${targetType === "channel" ? `<#${targetId}>` : `<@${targetId}>`}.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand.")] });
  },
};
