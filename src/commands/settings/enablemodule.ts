import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledModules } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "enablemodule",
  aliases: ["moduleon"],
  description: "Re-enable a module in a channel.",
  usage: "enablemodule <module> [#channel]",
  examples: ["enablemodule fun #general", "enablemodule levels"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "module", description: "Module name to re-enable", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Channel to re-enable in", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const mod = (ctx.getString("module") ?? ctx.args[0] ?? "").toLowerCase();
    const ch = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get((ctx.args[1] ?? "").replace(/[<#>]/g, "")) ?? null;
    const conditions: any[] = [eq(disabledModules.guildId, ctx.guild.id), eq(disabledModules.module, mod)];
    if (ch) conditions.push(eq(disabledModules.channelId, ch.id));
    await db.delete(disabledModules).where(and(...conditions));
    return ctx.reply({ embeds: [successEmbed(`**${mod}** re-enabled${ch ? ` in <#${ch.id}>` : " everywhere"}.`)] });
  },
};
