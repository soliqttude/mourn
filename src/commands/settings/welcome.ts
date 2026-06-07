import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { welcomeChannels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const VARIABLES = [
  "`{user}` — display name", "`{user.mention}` — mention", "`{user.avatar}` — avatar URL",
  "`{guild.name}` — server name", "`{guild.member_count}` — member count",
  "`{member.joined_at}` — join date", "`{inviter}` — who invited them",
];

export const command: HybridCommand = {
  name: "welcome",
  aliases: ["setwelcome"],
  description: "Manage welcome messages. Supports multiple channels.",
  usage: "welcome <add|remove|list|view|variables> [channel] [message]",
  examples: [
    "welcome add #welcome Welcome {user.mention} to {guild.name}!",
    "welcome remove #welcome",
    "welcome list",
    "welcome view #welcome",
    "welcome variables",
  ],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | list | view | variables", type: ApplicationCommandOptionType.String, required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }, { name: "view", value: "view" }, { name: "variables", value: "variables" }] },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "message", description: "Welcome message (supports embed scripting)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    if (sub === "variables") {
      return ctx.reply({ embeds: [brandEmbed({ title: "Welcome Variables", description: VARIABLES.join("\n") })] });
    }

    if (sub === "list") {
      const rows = await db.select().from(welcomeChannels).where(eq(welcomeChannels.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no welcome channels set up.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Welcome Channels", description: rows.map(r => `<#${r.channelId}>`).join("\n") })] });
    }

    const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(ctx.args[1]?.replace(/[<#>]/g, "") ?? "");
    if (!ch && sub !== "list" && sub !== "variables") return ctx.reply({ embeds: [errorEmbed("please provide a channel.")] });

    if (sub === "view") {
      const [row] = await db.select().from(welcomeChannels).where(and(eq(welcomeChannels.guildId, ctx.guild.id), eq(welcomeChannels.channelId, ch.id)));
      if (!row) return ctx.reply({ embeds: [errorEmbed("no welcome message for that channel.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: `Welcome — #${ch.name}`, description: row.message })] });
    }

    if (sub === "remove") {
      await db.delete(welcomeChannels).where(and(eq(welcomeChannels.guildId, ctx.guild.id), eq(welcomeChannels.channelId, ch.id)));
      return ctx.reply({ embeds: [successEmbed(`welcome message removed from <#${ch.id}>.`)] });
    }

    if (sub === "add") {
      const msg = ctx.getString("message") ?? ctx.args.slice(2).join(" ");
      if (!msg) return ctx.reply({ embeds: [errorEmbed("please provide a welcome message.")] });
      await db.insert(welcomeChannels).values({ guildId: ctx.guild.id, channelId: ch.id, message: msg })
        .onConflictDoUpdate({ target: [welcomeChannels.guildId, welcomeChannels.channelId], set: { message: msg } });
      return ctx.reply({ embeds: [successEmbed(`welcome message set for <#${ch.id}>.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("unknown subcommand.")] });
  },
};
