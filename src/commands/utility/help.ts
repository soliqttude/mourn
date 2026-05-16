import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { commands, findCommand } from "../../handlers/registry.js";

export const CAT_EMOJI: Record<string, string> = {
  economy:     "💰",
  fun:         "🎉",
  moderation:  "🛡️",
  settings:    "⚙️",
  utility:     "🔧",
  levels:      "⭐",
  giveaway:    "🎁",
  tags:        "🏷️",
  voicemaster: "🎤",
  custom:      "🌙",
};

export const CAT_LABEL: Record<string, string> = {
  economy:     "Economy",
  fun:         "Fun",
  moderation:  "Moderation",
  settings:    "Settings",
  utility:     "Utility",
  levels:      "Levels",
  giveaway:    "Giveaway",
  tags:        "Tags",
  voicemaster: "Voice",
  custom:      "Custom",
};

// ── Paged category embed ─────────────────────────────────────────────────────
export function buildPagedCategoryEmbed(
  catIndex: number,
  sortedCategories: string[],
  prefix: string
) {
  const total = sortedCategories.length;
  const idx = Math.max(0, Math.min(catIndex, total - 1));
  const category = sortedCategories[idx]!;

  const cmds = [...commands.values()]
    .filter((c) => c.category === category && !c.ownerOnly)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Align command names with padding
  const maxLen = Math.max(...cmds.map((c) => c.name.length), 4);
  const lines = cmds.map((c) => {
    const pad = " ".repeat(maxLen - c.name.length + 3);
    const desc = c.description.length > 55 ? c.description.slice(0, 52) + "…" : c.description;
    return `${c.name}${pad}${desc}`;
  });

  const label = `${CAT_LABEL[category] ?? category}`;
  const embed = brandEmbed({
    description:
      `**Mourn Help • ${label} (${idx + 1}/${total})**\n` +
      `\`${prefix}help <command>\` for details\n\n` +
      "```\n" + lines.join("\n") + "\n```",
  });

  // Buttons: ◀  Home  ▶
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`help:pg:${idx - 1}`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(idx === 0),
    new ButtonBuilder()
      .setCustomId("help:home")
      .setLabel("Home")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`help:pg:${idx + 1}`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(idx === total - 1),
  );

  return { embed, row };
}

// ── Category embed (kept for back-compat) ─────────────────────────────────────
export function buildCategoryEmbed(category: string, prefix: string) {
  const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
  const categories = [...new Set(visibleCmds.map((c) => c.category))].sort();
  const idx = categories.indexOf(category);
  return buildPagedCategoryEmbed(idx === -1 ? 0 : idx, categories, prefix);
}

// ── Help home ─────────────────────────────────────────────────────────────────
export function buildHelpHome(totalCmds: number, categories: string[], prefix: string) {
  const visibleCats = categories.filter((c) => c !== "owner");

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < visibleCats.length; i += 5) {
    const chunk = visibleCats.slice(i, i + 5);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      chunk.map((cat) =>
        new ButtonBuilder()
          .setCustomId(`help:cat:${cat}`)
          .setLabel(`${CAT_EMOJI[cat] ?? "📌"} ${CAT_LABEL[cat] ?? cat}`)
          .setStyle(ButtonStyle.Secondary),
      ),
    );
    rows.push(row);
  }

  const embed = brandEmbed({
    description: [
      `**${totalCmds}** commands · **${visibleCats.length}** categories`,
      ``,
      `pick a category below, or use \`${prefix}help <command>\` for command details.`,
    ].join("\n"),
  });

  return { embed, rows };
}

// ── Command ───────────────────────────────────────────────────────────────────
export const command: HybridCommand = {
  name: "help",
  aliases: ["h", "commands", "cmds"],
  description: "Browse commands by category or look up a specific command.",
  category: "utility",
  options: [
    {
      name: "command",
      description: "Look up a specific command",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async execute(ctx) {
    const target = ctx.getString("command") ?? ctx.args[0];

    // ── Single command lookup ─────────────────────────────────────────────────
    if (target) {
      const c = findCommand(target);
      if (!c || c.ownerOnly)
        return ctx.reply({ embeds: [errorEmbed(`no command found: \`${target}\``)] });

      const lines = [
        `**${c.name}** — ${c.description}`,
        ``,
        `**category** — ${CAT_EMOJI[c.category] ?? "📌"} ${CAT_LABEL[c.category] ?? c.category}`,
        `**permission** — ${(c as any).permission ?? "everyone"}`,
        c.aliases?.length
          ? `**aliases** — ${c.aliases.map((a) => `\`${a}\``).join(", ")}`
          : null,
        (c as any).usage
          ? `**usage** — \`${ctx.prefix}${(c as any).usage}\``
          : null,
      ].filter(Boolean) as string[];

      return ctx.reply({ embeds: [brandEmbed({ description: lines.join("\n") })] });
    }

    // ── Category paginator ────────────────────────────────────────────────────
    const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
    const categories = [...new Set(visibleCmds.map((c) => c.category))].sort();
    const { embed, row } = buildPagedCategoryEmbed(0, categories, ctx.prefix);
    return ctx.reply({ embeds: [embed], components: [row as any] });
  },
};
