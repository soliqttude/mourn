import {
  ApplicationCommandOptionType,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { parseScript } from "../../lib/scripting.js";
import { resolveChannel } from "../../lib/parsing.js";
import { getGuildSettings } from "../../db/settings.js";
import type { TicketTopic } from "../../features/tickets.js";

// Strip ``` code block wrappers so users can paste wrapped code directly
function stripCodeBlock(s: string): string {
  return s
    .replace(/^```[^\n]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

// Build ticket topic button rows (mirrors createTicketPanel logic)
function buildTopicRows(topics: TicketTopic[]): ActionRowBuilder<ButtonBuilder>[] {
  if (!topics.length) return [];
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();
  let col = 0;
  for (const t of topics.slice(0, 20)) {
    const btn = new ButtonBuilder()
      .setCustomId(`ticket:open:${encodeURIComponent(t.name)}`)
      .setLabel(t.name.toLowerCase())
      .setStyle(ButtonStyle.Secondary);
    if (t.emoji) btn.setEmoji(t.emoji);
    row.addComponents(btn);
    col++;
    if (col === 5) { rows.push(row); row = new ActionRowBuilder<ButtonBuilder>(); col = 0; }
  }
  if (col > 0) rows.push(row);
  return rows;
}

export const command: HybridCommand = {
  name: "createembed",
  aliases: ["ce"],
  description: "Send a mourn-style scripted embed to a channel.",
  category: "utility",
  permission: "manage_messages",
  guildOnly: true,
  usage: "ce [#channel] {embed}$v{key: value}$v...",
  examples: [
    "ce #general {embed}$v{title: Hello}$v{description: World}$v{color: #5865f2}",
    "ce {embed}$v{description: line1 /e line2}$v{color: blurple}$v{image: https://...}",
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
    {
      name: "panel",
      description: "Attach configured ticket topic buttons to this embed",
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    let target = ctx.getChannel("channel") as any;
    let code   = "";

    if (ctx.source === "prefix") {
      // Use rawArgs to preserve newlines (args.join(" ") collapses them)
      let raw = ctx.rawArgs;

      // Extract leading channel mention before the code
      const chanMatch = raw.match(/^(<#\d{17,20}>|#\S+)\s+/);
      if (chanMatch) {
        const resolved = resolveChannel(ctx.guild, chanMatch[1]!);
        if (resolved) { target = resolved; raw = raw.slice(chanMatch[0].length); }
      }

      // Strip ``` code block wrappers (users often paste wrapped)
      raw = raw.trim();
      if (raw.includes("```")) raw = stripCodeBlock(raw);

      code = raw.trim();
    } else {
      code = ctx.getString("code") ?? "";
      if (!target) target = ctx.getChannel("channel") as any;
    }

    if (!target) target = ctx.channel;

    if (!target?.isTextBased()) {
      return ctx.reply({ embeds: [errorEmbed("Couldn't resolve a text **channel**.")] });
    }
    if (!code.trim()) {
      return ctx.reply({ embeds: [errorEmbed("Provide embed scripting code.")] });
    }

    const { embeds, content, components: scriptComponents } = parseScript(code, {
      user:    ctx.member ?? ctx.user ?? undefined,
      guild:   ctx.guild,
      channel: ctx.channel as any,
      client:  ctx.client,
    });

    if (embeds.length === 0 && !content) {
      return ctx.reply({ embeds: [errorEmbed("No embeds or content parsed from the script.")] });
    }

    // Attach ticket topic buttons if:
    //  • --panel flag passed (slash), OR
    //  • prefix command has "panel" word anywhere in rawArgs before the embed code, OR
    //  • no button components came from the script itself and guild has topics configured
    const wantsPanel =
      ctx.getBoolean("panel") === true ||
      (ctx.source === "prefix" && /\bpanel\b/i.test(ctx.rawArgs.split("{embed}")[0] ?? ""));

    let panelRows: ActionRowBuilder<ButtonBuilder>[] = [];
    if (wantsPanel || scriptComponents.length === 0) {
      const settings = await getGuildSettings(ctx.guild.id);
      const topics = (Array.isArray((settings as any).ticketTopics)
        ? (settings as any).ticketTopics : []) as TicketTopic[];
      panelRows = buildTopicRows(topics);
    }

    const allComponents = [...scriptComponents, ...panelRows].slice(0, 5);

    try {
      await (target as any).send({
        content: content ?? undefined,
        embeds,
        components: allComponents,
      });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to send — check my **permissions** in that **channel**.")] });
    }

    if (ctx.source === "prefix") {
      try { await (ctx.raw as import("discord.js").Message).delete(); } catch { /* ignore */ }
    } else {
      try { await ctx.reply({ content: "✓", ephemeral: true } as any); } catch { /* ignore */ }
    }
  },
};
