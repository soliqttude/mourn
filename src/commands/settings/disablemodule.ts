import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledModules } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const MODULES = ["moderation", "music", "leveling", "utility", "fun", "social", "lastfm", "tickets", "giveaways", "automod"];

export const command: HybridCommand = {
  name: "disablemodule",
  aliases: ["disablemod"],
  description: "Disable a module in a channel.",
  usage: "disablemodule <channel|all|list> <module>",
  examples: ["disablemodule #general music", "disablemodule all fun", "disablemodule list"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "target", description: "Channel, 'all', or 'list'", type: ApplicationCommandOptionType.String, required: true },
    { name: "module", description: `Module: ${MODULES.join(" | ")}`, type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const rawTarget = (ctx.getString("target") ?? ctx.args[0] ?? "").toLowerCase();
    const mod = (ctx.getString("module") ?? ctx.args[1] ?? "").toLowerCase();

    if (rawTarget === "list") {
      const rows = await db.select().from(disabledModules).where(eq(disabledModules.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no disabled modules.")] });
      const grouped: Record<string, string[]> = {};
      for (const r of rows) { (grouped[`<#${r.channelId}>`] ??= []).push(`\`${r.module}\``); }
      const lines = Object.entries(grouped).map(([k, v]) => `${k}: ${v.join(", ")}`);
      return ctx.reply({ embeds: [brandEmbed({ title: "Disabled Modules", description: lines.join("\n") })] });
    }

    if (!mod || !MODULES.includes(mod)) return ctx.reply({ embeds: [errorEmbed(`unknown module. available: ${MODULES.join(", ")}`)] });

    if (rawTarget === "all") {
      for (const [, ch] of ctx.guild.channels.cache.filter(c => c.isTextBased())) {
        await db.insert(disabledModules).values({ guildId: ctx.guild.id, channelId: ch.id, module: mod }).onConflictDoNothing();
      }
      return ctx.reply({ embeds: [successEmbed(`module \`${mod}\` disabled in all channels.`)] });
    }

    const channelId = rawTarget.replace(/[<#>]/g, "");
    await db.insert(disabledModules).values({ guildId: ctx.guild.id, channelId, module: mod }).onConflictDoNothing();
    return ctx.reply({ embeds: [successEmbed(`module \`${mod}\` disabled in <#${channelId}>.`)] });
  },
};
