import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledModules } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const KNOWN_MODULES = [
  "moderation", "automod", "logging", "welcome", "goodbye", "invites",
  "levels", "tags", "autoresponders", "tickets", "giveaways", "starboard",
  "voicemaster", "reaction-roles", "counting", "highlights", "social",
  "music", "economy", "fun", "utility", "info",
];

export const command: HybridCommand = {
  name: "disablemodule",
  aliases: ["moduleoff"],
  description: "Disable an entire feature module in a channel.",
  usage: "disablemodule <module> [#channel] | disablemodule list | disablemodule modules",
  examples: ["disablemodule fun #general", "disablemodule levels", "disablemodule list", "disablemodule modules"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "module", description: "Module name, list, or modules", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Channel to disable in (default: current)", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const mod = (ctx.getString("module") ?? ctx.args[0] ?? "").toLowerCase();

    if (mod === "modules") {
      return ctx.reply({ embeds: [brandEmbed({ title: "available modules", description: KNOWN_MODULES.map(m => `\`${m}\``).join(", ") })] });
    }

    if (mod === "list") {
      const rows = await db.select().from(disabledModules).where(eq(disabledModules.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no modules disabled.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "disabled modules", description: rows.map(r => `**${r.module}** in <#${r.channelId}>`).join("\n") })] });
    }

    const ch = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get((ctx.args[1] ?? "").replace(/[<#>]/g, "")) ?? ctx.channel;
    if (!ch) return ctx.reply({ embeds: [errorEmbed("invalid channel.")] });

    const existing = await db.select().from(disabledModules).where(and(
      eq(disabledModules.guildId, ctx.guild.id),
      eq(disabledModules.channelId, ch.id),
      eq(disabledModules.module, mod),
    ));

    if (existing.length) {
      await db.delete(disabledModules).where(and(eq(disabledModules.guildId, ctx.guild.id), eq(disabledModules.channelId, ch.id), eq(disabledModules.module, mod)));
      return ctx.reply({ embeds: [successEmbed(`**${mod}** re-enabled in <#${ch.id}>.`)] });
    }

    await db.insert(disabledModules).values({ guildId: ctx.guild.id, channelId: ch.id, module: mod }).onConflictDoNothing();
    return ctx.reply({ embeds: [successEmbed(`**${mod}** disabled in <#${ch.id}>.`)] });
  },
};
