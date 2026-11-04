import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledModules } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "enablemodule",
  aliases: ["moduleon"],
  description: "Re-enable a module in a channel or every channel.",
  usage: "enablemodule <module> [#channel] | enablemodule all <module>",
  examples: ["enablemodule fun #general", "enablemodule levels", "enablemodule all levels"],
  category: "settings",
  permission: "everyone",
  guildOnly: true,
  options: [
    { name: "module", description: "Module name to re-enable", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Only re-enable in this channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "all_channels", description: "Re-enable this module in every channel", type: ApplicationCommandOptionType.Boolean, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const raw = ctx.getString("module") ?? ctx.args[0] ?? "";
    const allChannels = raw.toLowerCase() === "all";
    const mod = (allChannels ? (ctx.args[1] ?? "") : raw).toLowerCase();
    const channel = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get((ctx.args[allChannels ? 2 : 1] ?? "").replace(/[<#>]/g, "")) ?? null;
    const everyChannel = allChannels || ctx.getString("all_channels") === "true" || ctx.args.some(a => a.toLowerCase() === "all");
    const moduleName = allChannels ? mod : raw.toLowerCase();
    if (!moduleName || moduleName === "all") return ctx.reply({ embeds: [errorEmbed("Provide a module name.")] });
    const conditions = [eq(disabledModules.guildId, ctx.guild.id), eq(disabledModules.module, moduleName)];
    if (!everyChannel && channel) conditions.push(eq(disabledModules.channelId, channel.id));
    await db.delete(disabledModules).where(and(...conditions));
    return ctx.reply({ embeds: [successEmbed("**" + moduleName + "** re-enabled " + (everyChannel || !channel ? "in every channel." : "in <#" + channel.id + ">.") )] });
  },
};
