import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { imgonlyChannels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "imgonly",
  aliases: ["imageonly", "gallery"],
  description: "Restrict channels to images and captions only.",
  usage: "imgonly <add|remove|list> [channel]",
  examples: ["imgonly add #media", "imgonly remove #media", "imgonly list"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "add | remove | list", type: ApplicationCommandOptionType.String, required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }] },
    { name: "channel", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    if (sub === "list") {
      const rows = await db.select().from(imgonlyChannels).where(eq(imgonlyChannels.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no image-only channels configured.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "Image-Only Channels", description: rows.map(r => `<#${r.channelId}>`).join("\n") })] });
    }

    const ch = ctx.getChannel("channel") ?? (ctx.args[1] ? ctx.guild.channels.cache.get(ctx.args[1].replace(/[<#>]/g, "")) : null) as any;
    if (!ch) return ctx.reply({ embeds: [errorEmbed("please provide a channel.")] });

    if (sub === "add") {
      await db.insert(imgonlyChannels).values({ guildId: ctx.guild.id, channelId: ch.id }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`<#${ch.id}> is now image-only. non-image messages will be deleted.`)] });
    }

    if (sub === "remove") {
      await db.delete(imgonlyChannels).where(and(eq(imgonlyChannels.guildId, ctx.guild.id), eq(imgonlyChannels.channelId, ch.id)));
      return ctx.reply({ embeds: [successEmbed(`<#${ch.id}> is no longer image-only.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("unknown subcommand. use: add | remove | list")] });
  },
};
