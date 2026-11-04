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
  "music", "fun", "utility", "info",
];

export const command: HybridCommand = {
  name: "disablemodule",
  aliases: ["moduleoff"],
  description: "Disable a module in a channel or every channel.",
  usage: "disablemodule <module> [#channel] | disablemodule all <module> | disablemodule list",
  examples: ["disablemodule fun #general", "disablemodule levels", "disablemodule all levels", "disablemodule list"],
  category: "settings",
  permission: "manage_channels",
  guildOnly: true,
  options: [
    { name: "module", description: "Module name, or list", type: ApplicationCommandOptionType.String, required: true },
    { name: "channel", description: "Channel to disable in", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "all_channels", description: "Disable this module in every channel", type: ApplicationCommandOptionType.Boolean, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const raw = (ctx.getString("module") ?? ctx.args[0] ?? "").toLowerCase();
    if (raw === "list") {
      const rows = await db.select().from(disabledModules).where(eq(disabledModules.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No modules are disabled.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "disabled modules", description: rows.map(r => "**" + r.module + "** in <#" + r.channelId + ">").join("\n") })] });
    }
    const allChannels = raw === "all";
    const moduleName = allChannels ? (ctx.args[1] ?? "").toLowerCase() : raw;
    const channel = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get((ctx.args[allChannels ? 2 : 1] ?? "").replace(/[<#>]/g, "")) ?? ctx.channel;
    const everyChannel = allChannels || ctx.getString("all_channels") === "true" || ctx.args.some(a => a.toLowerCase() === "all");
    if (!moduleName || moduleName === "all") return ctx.reply({ embeds: [errorEmbed("Provide a module name.")] });
    if (!KNOWN_MODULES.includes(moduleName)) return ctx.reply({ embeds: [errorEmbed("Unknown module. Use a valid module name.")] });
    if (everyChannel) {
      const channels = ctx.guild.channels.cache.filter(c => c.isTextBased() && "send" in c);
      await db.insert(disabledModules).values([...channels.keys()].map(channelId => ({ guildId: ctx.guild!.id, channelId, module: moduleName }))).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed("**" + moduleName + "** disabled in every text channel.")] });
    }
    if (!channel) return ctx.reply({ embeds: [errorEmbed("Invalid channel.")] });
    await db.insert(disabledModules).values({ guildId: ctx.guild.id, channelId: channel.id, module: moduleName }).onConflictDoNothing();
    return ctx.reply({ embeds: [successEmbed("**" + moduleName + "** disabled in <#" + channel.id + ">.")] });
  },
};
