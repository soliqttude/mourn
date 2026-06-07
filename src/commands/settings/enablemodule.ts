import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledModules } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const MODULES = ["moderation", "music", "leveling", "utility", "fun", "social", "lastfm", "tickets", "giveaways", "automod"];

export const command: HybridCommand = {
  name: "enablemodule",
  aliases: ["enablemod"],
  description: "Re-enable a module in a channel.",
  usage: "enablemodule <channel|all> <module>",
  examples: ["enablemodule #general music", "enablemodule all fun"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "target", description: "Channel or 'all'", type: ApplicationCommandOptionType.String, required: true },
    { name: "module", description: `Module: ${MODULES.join(" | ")}`, type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rawTarget = ctx.getString("target") ?? ctx.args[0] ?? "";
    const mod = (ctx.getString("module") ?? ctx.args[1] ?? "").toLowerCase();
    if (!MODULES.includes(mod)) return ctx.reply({ embeds: [errorEmbed(`unknown module. available: ${MODULES.join(", ")}`)] });

    if (rawTarget === "all") {
      await db.delete(disabledModules).where(and(eq(disabledModules.guildId, ctx.guild.id), eq(disabledModules.module, mod)));
      return ctx.reply({ embeds: [successEmbed(`module \`${mod}\` enabled in all channels.`)] });
    }

    const channelId = rawTarget.replace(/[<#>]/g, "");
    await db.delete(disabledModules).where(and(eq(disabledModules.guildId, ctx.guild.id), eq(disabledModules.channelId, channelId), eq(disabledModules.module, mod)));
    return ctx.reply({ embeds: [successEmbed(`module \`${mod}\` enabled in <#${channelId}>.`)] });
  },
};
