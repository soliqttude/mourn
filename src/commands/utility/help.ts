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

export function buildCategoryEmbed(category: string, prefix: string) {
  const cmds = [...commands.values()]
    .filter((c) => c.category === category && !c.ownerOnly)
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines = cmds.map((c) => `\`${c.name}\` — ${c.description.slice(0, 60)}`);
  let desc = lines.join("\n");
  if (desc.length > 3800) {
    const kept: string[] = [];
    let len = 0;
    for (const l of lines) {
      if (len + l.length + 1 > 3800) break;
      kept.push(l);
      len += l.length + 1;
    }
    desc = kept.join("\n") + `\n*…and ${lines.length - kept.length} more*`;
  }

  const embed = brandEmbed({
    description:
      `**${CAT_EMOJI[category] ?? "📌"} ${CAT_LABEL[category] ?? category}** — ${cmds.length} commands\n\n` +
      desc +
      `\n\n*use \`${prefix}help <command>\` for details on any command.*`,
  });

  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("help:back")
      .setLabel("← back")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embed, row: backRow };
}

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

    const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
    const categories = [...new Set(visibleCmds.map((c) => c.category))].sort();

    if (ctx.source === "slash") {
      const { embed, rows } = buildHelpHome(visibleCmds.length, categories, ctx.prefix);
      return ctx.reply({ embeds: [embed], components: rows as any[] });
    }

    // Prefix: grouped list with command names
    const grouped: Record<string, string[]> = {};
    for (const c of visibleCmds) {
      grouped[c.category] ??= [];
      grouped[c.category].push(`\`${c.name}\``);
    }
    const fields = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, cmds]) => ({
        name: `${CAT_EMOJI[cat] ?? "📌"} ${CAT_LABEL[cat] ?? cat} (${cmds.length})`,
        value: cmds.sort().join(" "),
      }));
    return ctx.reply({
      embeds: [
        brandEmbed({
          description: `prefix: \`${ctx.prefix}\` · **${visibleCmds.length}** commands · \`${ctx.prefix}help <command>\` for details`,
          fields,
        }),
      ],
    });
  },
};
