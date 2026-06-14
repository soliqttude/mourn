import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { stickyMessages } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "stickymessage",
  aliases: ["sticky", "sm"],
  description: "Manage sticky messages in channels.",
  usage: "stickymessage <add|remove|list|view> [channel] [message]",
  examples: [
    "stickymessage add #general Welcome to the chat!",
    "stickymessage remove #general",
    "stickymessage list",
    "stickymessage view #general",
  ],
  category: "settings",
  permission: "manage_messages",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | list | view", type: ApplicationCommandOptionType.String, required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }, { name: "view", value: "view" }] },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "message", description: "Sticky message content", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    if (sub === "list") {
      const rows = await db.select().from(stickyMessages).where(eq(stickyMessages.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No sticky messages set up.")] });
      const lines = rows.map(r => `<#${r.channelId}> — ${r.message.slice(0, 50)}${r.message.length > 50 ? "…" : ""}`);
      return ctx.reply({ embeds: [brandEmbed({ title: "Sticky Messages", description: lines.join("\n") })] });
    }

    const channelArg = ctx.getChannel("channel") ?? (ctx.args[1] ? ctx.guild.channels.cache.get(ctx.args[1].replace(/[<#>]/g, "")) : null);
    if (!channelArg && sub !== "list") return ctx.reply({ embeds: [errorEmbed("Please provide a **channel**.")] });
    const channelId = (channelArg as any)?.id ?? ctx.args[1]?.replace(/[<#>]/g, "");

    if (sub === "view") {
      const [row] = await db.select().from(stickyMessages).where(and(eq(stickyMessages.guildId, ctx.guild.id), eq(stickyMessages.channelId, channelId)));
      if (!row) return ctx.reply({ embeds: [errorEmbed("No sticky message for that **channel**.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: `Sticky — #${(ctx.guild.channels.cache.get(channelId) as any)?.name ?? channelId}`, description: row.message })] });
    }

    if (sub === "remove") {
      await db.delete(stickyMessages).where(and(eq(stickyMessages.guildId, ctx.guild.id), eq(stickyMessages.channelId, channelId)));
      return ctx.reply({ embeds: [successEmbed(`sticky message removed from <#${channelId}>.`)] });
    }

    if (sub === "add") {
      const msg = ctx.getString("message") ?? ctx.args.slice(2).join(" ");
      if (!msg) return ctx.reply({ embeds: [errorEmbed("Please provide a message.")] });
      await db.insert(stickyMessages).values({ guildId: ctx.guild.id, channelId, message: msg })
        .onConflictDoUpdate({ target: [stickyMessages.guildId, stickyMessages.channelId], set: { message: msg } });
      return ctx.reply({ embeds: [successEmbed(`sticky message set in <#${channelId}>.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand. use: add | remove | list | view")] });
  },
};
