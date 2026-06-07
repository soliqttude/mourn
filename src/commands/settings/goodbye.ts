import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { goodbyeChannels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const VARIABLES = [
  "`{user}` — display name", "`{user.mention}` — mention",
  "`{guild.name}` — server name", "`{guild.member_count}` — member count",
];

export const command: HybridCommand = {
  name: "goodbye",
  aliases: ["setgoodbye"],
  description: "Manage goodbye messages. Supports multiple channels.",
  usage: "goodbye <add|remove|list|view|variables> [channel] [message]",
  examples: ["goodbye add #bye Goodbye {user}!", "goodbye remove #bye", "goodbye list"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | list | view | variables", type: ApplicationCommandOptionType.String, required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }, { name: "view", value: "view" }, { name: "variables", value: "variables" }] },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "message", description: "Goodbye message", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    if (sub === "variables") return ctx.reply({ embeds: [brandEmbed({ title: "Goodbye Variables", description: VARIABLES.join("\n") })] });
    if (sub === "list") {
      const rows = await db.select().from(goodbyeChannels).where(eq(goodbyeChannels.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no goodbye channels set up.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Goodbye Channels", description: rows.map(r => `<#${r.channelId}>`).join("\n") })] });
    }
    const ch = ctx.getChannel("channel") as any ?? ctx.guild.channels.cache.get(ctx.args[1]?.replace(/[<#>]/g, "") ?? "");
    if (!ch) return ctx.reply({ embeds: [errorEmbed("please provide a channel.")] });
    if (sub === "view") {
      const [row] = await db.select().from(goodbyeChannels).where(and(eq(goodbyeChannels.guildId, ctx.guild.id), eq(goodbyeChannels.channelId, ch.id)));
      if (!row) return ctx.reply({ embeds: [errorEmbed("no goodbye message for that channel.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: `Goodbye — #${ch.name}`, description: row.message })] });
    }
    if (sub === "remove") {
      await db.delete(goodbyeChannels).where(and(eq(goodbyeChannels.guildId, ctx.guild.id), eq(goodbyeChannels.channelId, ch.id)));
      return ctx.reply({ embeds: [successEmbed(`goodbye message removed from <#${ch.id}>.`)] });
    }
    if (sub === "add") {
      const msg = ctx.getString("message") ?? ctx.args.slice(2).join(" ");
      if (!msg) return ctx.reply({ embeds: [errorEmbed("please provide a goodbye message.")] });
      await db.insert(goodbyeChannels).values({ guildId: ctx.guild.id, channelId: ch.id, message: msg })
        .onConflictDoUpdate({ target: [goodbyeChannels.guildId, goodbyeChannels.channelId], set: { message: msg } });
      return ctx.reply({ embeds: [successEmbed(`goodbye message set for <#${ch.id}>.`)] });
    }
    return ctx.reply({ embeds: [errorEmbed("unknown subcommand.")] });
  },
};
