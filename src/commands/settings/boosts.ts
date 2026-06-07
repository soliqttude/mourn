import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { boostChannels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const VARIABLES = [
  "`{user}` — booster's display name", "`{user.mention}` — mention the booster",
  "`{guild.name}` — server name", "`{guild.boost_count}` — total boosts",
  "`{guild.boost_level}` — boost tier", "`{member.boost}` — when they started boosting",
];

export const command: HybridCommand = {
  name: "boosts",
  aliases: ["setboost", "boost"],
  description: "Manage boost messages. Supports multiple channels.",
  usage: "boosts <add|remove|list|view|variables> [channel] [message]",
  examples: [
    "boosts add #boosts {user.mention} just boosted! 🚀",
    "boosts remove #boosts",
    "boosts list",
    "boosts view #boosts",
    "boosts variables",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | list | view | variables", type: ApplicationCommandOptionType.String, required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }, { name: "view", value: "view" }, { name: "variables", value: "variables" }] },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "message", description: "Boost message (supports embed scripting)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    if (sub === "variables") return ctx.reply({ embeds: [brandEmbed({ title: "Boost Variables", description: VARIABLES.join("\n") })] });
    if (sub === "list") {
      const rows = await db.select().from(boostChannels).where(eq(boostChannels.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no boost channels set up.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Boost Channels", description: rows.map(r => `<#${r.channelId}>`).join("\n") })] });
    }
    const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(ctx.args[1]?.replace(/[<#>]/g, "") ?? "");
    if (!ch) return ctx.reply({ embeds: [errorEmbed("please provide a channel.")] });
    if (sub === "view") {
      const [row] = await db.select().from(boostChannels).where(and(eq(boostChannels.guildId, ctx.guild.id), eq(boostChannels.channelId, ch.id)));
      if (!row) return ctx.reply({ embeds: [errorEmbed("no boost message for that channel.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: `Boost — #${ch.name}`, description: row.message })] });
    }
    if (sub === "remove") {
      await db.delete(boostChannels).where(and(eq(boostChannels.guildId, ctx.guild.id), eq(boostChannels.channelId, ch.id)));
      return ctx.reply({ embeds: [successEmbed(`boost message removed from <#${ch.id}>.`)] });
    }
    if (sub === "add") {
      const msg = ctx.getString("message") ?? ctx.args.slice(2).join(" ");
      if (!msg) return ctx.reply({ embeds: [errorEmbed("please provide a boost message.")] });
      await db.insert(boostChannels).values({ guildId: ctx.guild.id, channelId: ch.id, message: msg })
        .onConflictDoUpdate({ target: [boostChannels.guildId, boostChannels.channelId], set: { message: msg } });
      return ctx.reply({ embeds: [successEmbed(`boost message set for <#${ch.id}>.`)] });
    }
    return ctx.reply({ embeds: [errorEmbed("unknown subcommand.")] });
  },
};
