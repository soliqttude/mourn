import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { socialSubscriptions } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { resolveChannel } from "../../lib/parsing.js";

const PLATFORMS = ["youtube", "twitch", "reddit"] as const;

export const command: HybridCommand = {
  name: "socialnotify",
  aliases: ["sn", "notify"],
  description: "Set up social media notifications. Subcommands: add, remove, list",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  usage: "socialnotify [add|remove|list] [platform] [target] [#channel] [message]",
  examples: [
    "socialnotify add youtube UCxxxxxx #notifications",
    "socialnotify add twitch streamername #live New stream: {title}",
    "socialnotify add reddit programming #reddit",
    "socialnotify list",
    "socialnotify remove 1",
  ],
  options: [
    { name: "subcommand", description: "add | remove | list", type: ApplicationCommandOptionType.String, required: true },
    { name: "platform", description: "youtube | twitch | reddit", type: ApplicationCommandOptionType.String, required: false },
    { name: "target", description: "Channel ID / username / subreddit", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Discord channel for notifications", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "message", description: "Custom notification message", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const guildId = ctx.guild.id;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    if (sub === "add") {
      const platform = (ctx.getString("platform") ?? ctx.args[1] ?? "").toLowerCase() as typeof PLATFORMS[number];
      const target = ctx.getString("target") ?? ctx.args[2];
      if (!PLATFORMS.includes(platform)) return ctx.reply({ embeds: [errorEmbed(`platform must be one of: ${PLATFORMS.join(", ")}`)] });
      if (!target) return ctx.reply({ embeds: [errorEmbed("Provide a target (**channel** ID, **username**, or subreddit).")] });
      const ch = ctx.getChannel("channel") ?? (ctx.args[3] ? resolveChannel(ctx.guild, ctx.args[3]) : null);
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Provide a discord **channel**.")] });
      const message = ctx.getString("message") ?? ctx.args.slice(4).join(" ") || null;

      const existing = await db.select().from(socialSubscriptions).where(and(eq(socialSubscriptions.guildId, guildId), eq(socialSubscriptions.platform, platform), eq(socialSubscriptions.target, target)));
      if (existing.length) return ctx.reply({ embeds: [errorEmbed(`already subscribed to \`${platform}/${target}\`.`)] });

      await db.insert(socialSubscriptions).values({ guildId, channelId: ch.id, platform, target, message });
      return ctx.reply({ embeds: [successEmbed(`subscribed to **${platform}/${target}** → <#${ch.id}>.${platform === "twitch" ? "\n⚠️ Twitch requires `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` env vars." : ""}`)] });
    }

    if (sub === "remove") {
      const id = parseInt(ctx.getString("platform") ?? ctx.args[1] ?? "");
      if (isNaN(id)) return ctx.reply({ embeds: [errorEmbed("Provide the subscription ID (from `socialnotify list`).")] });
      const rows = await db.select().from(socialSubscriptions).where(and(eq(socialSubscriptions.guildId, guildId), eq(socialSubscriptions.id, id)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("Subscription not found.")] });
      await db.delete(socialSubscriptions).where(eq(socialSubscriptions.id, id));
      return ctx.reply({ embeds: [successEmbed("Subscription removed.")] });
    }

    const rows = await db.select().from(socialSubscriptions).where(eq(socialSubscriptions.guildId, guildId));
    if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No social subscriptions.")] });
    const lines = rows.map(r => `\`#${r.id}\` **${r.platform}** / \`${r.target}\` → <#${r.channelId}>`);
    return ctx.reply({ embeds: [brandEmbed({ title: "Social Notifications", description: lines.join("\n") })] });
  },
};
