import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { parseScript } from "../../lib/scripting.js";
import { resolveChannel } from "../../lib/parsing.js";

export const command: HybridCommand = {
  name: "createembed",
  aliases: ["ce"],
  description: "Send a bleed-style scripted embed to a channel.",
  category: "utility",
  permission: "mod",
  guildOnly: true,
  usage: "ce [#channel] {embed}$v{key: value}$v...",
  examples: [
    "ce #general {embed}$v{title: Hello}$v{description: World}$v{color: #5865f2}",
    "ce {embed}$v{description: line1 /e line2}$v{color: blurple}$v{image: https://...}",
    "ce #welcome {embed}$v{description: Welcome!}$v{color: green}{embed}$v{field: Rules && Read #rules && true}",
  ],
  options: [
    {
      name: "channel",
      description: "Channel to send to (defaults to current channel)",
      type: ApplicationCommandOptionType.Channel,
      required: false,
      channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
    },
    {
      name: "code",
      description: "Embed scripting code",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    // ── Resolve target channel ────────────────────────────────────────────────
    // Slash: use channel option if provided, else current channel
    // Prefix: first arg is a channel mention/ID → use it; otherwise current channel
    let target = ctx.getChannel("channel") as any;
    let code   = ctx.getString("code") ?? "";

    if (!target && ctx.args.length > 0) {
      // Check if first arg looks like a channel mention or ID
      const first = ctx.args[0]!;
      if (/^(<#)?\d{17,20}>?$/.test(first)) {
        const resolved = resolveChannel(ctx.guild, first);
        if (resolved) {
          target = resolved;
          code   = ctx.args.slice(1).join(" ");
        } else {
          code = ctx.args.join(" ");
        }
      } else {
        code = ctx.args.join(" ");
      }
    }

    // Fall back to current channel
    if (!target) {
      target = ctx.channel;
    }

    if (!target?.isTextBased()) {
      return ctx.reply({ embeds: [errorEmbed("couldn't resolve a text channel.")] });
    }

    if (!code.trim()) {
      return ctx.reply({ embeds: [errorEmbed("provide embed scripting code.")] });
    }

    // ── Parse the script ──────────────────────────────────────────────────────
    const { embeds, content } = parseScript(code, {
      user:    ctx.member ?? ctx.user ?? undefined,
      guild:   ctx.guild,
      channel: ctx.channel as any,
    });

    if (embeds.length === 0 && !content) {
      return ctx.reply({ embeds: [errorEmbed("no embeds or content parsed from the script.")] });
    }

    // ── Send ──────────────────────────────────────────────────────────────────
    try {
      await target.send({
        content:  content ?? undefined,
        embeds,
      });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("failed to send — check my permissions in that channel.")] });
    }

    // ── Delete the command message (like bleed does) ──────────────────────────
    if (ctx.message) {
      try { await ctx.message.delete(); } catch { /* no permission, ignore */ }
    }

    // For slash interactions, acknowledge silently
    if (!ctx.message) {
      try {
        await ctx.reply({ content: "✓", ephemeral: true } as any);
      } catch { /* already acknowledged */ }
    }
  },
};
