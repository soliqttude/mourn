import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { commands, findCommand } from "../../handlers/registry.js";

const CAT_EMOJI: Record<string, string> = {
  economy: "💰", fun: "🎉", moderation: "🛡️", settings: "⚙️",
  utility: "🔧", levels: "⭐", giveaway: "🎁", tags: "🏷️",
  voicemaster: "🎤", custom: "🤖", owner: "👑",
};

export const command: HybridCommand = {
  name: "help",
  aliases: ["h", "commands"],
  description: "Browse commands by category or look up a specific command.",
  category: "utility",
  options: [
    {
      name: "command",
      description: "Get detailed info on a specific command",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async execute(ctx) {
    const target = ctx.getString("command") ?? ctx.args[0];

    // ── Single command info ──────────────────────────────────────────────
    if (target) {
      const c = findCommand(target);
      if (!c) return ctx.reply({ embeds: [errorEmbed(`Unknown command: \`${target}\``)] });
      // Hide owner commands from non-owners
      if (c.ownerOnly && ctx.user.id !== "177803210738630656")
        return ctx.reply({ embeds: [errorEmbed(`Unknown command: \`${target}\``)] });
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: `Command — ${c.name}`,
            description: c.description,
            fields: [
              {
                name: "Category",
                value: `${CAT_EMOJI[c.category] ?? "📌"} ${c.category}`,
                inline: true,
              },
              { name: "Permission", value: (c as any).permission ?? "everyone", inline: true },
              {
                name: "Aliases",
                value: c.aliases?.length ? c.aliases.map((a) => `\`${a}\``).join(", ") : "—",
                inline: true,
              },
              ...((c as any).usage ? [{ name: "Usage", value: `\`${ctx.prefix}${(c as any).usage}\`` }] : []),
            ],
            page: "Help",
          }),
        ],
      });
    }

    // Filter out owner-only commands for non-owners
    const isOwner = ctx.user.id === "177803210738630656";
    const visibleCommands = [...commands.values()].filter(c => isOwner || !c.ownerOnly);

    // ── Slash: interactive category dropdown ────────────────────────────
    if (ctx.source === "slash") {
      const categories = [...new Set(visibleCommands.map((c) => c.category))].sort();
      const select = new StringSelectMenuBuilder()
        .setCustomId("help:category")
        .setPlaceholder("📂  Choose a category…")
        .addOptions(
          categories.map((cat) => ({
            label: `${CAT_EMOJI[cat] ?? "📌"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
            value: cat,
            description: `Browse ${cat} commands`,
          }))
        );
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
      return ctx.reply({
        embeds: [
          brandEmbed({
            title: "Mourn — Help",
            description: [
              `**${visibleCommands.length}** commands across **${categories.length}** categories.`,
              "",
              "Pick a category from the dropdown below to browse its commands.",
              `Or use \`/help command:<name>\` for details on a specific command.`,
            ].join("\n"),
            page: "Help",
          }),
        ],
        components: [row as any],
      });
    }

    // ── Prefix: full list grouped by category ───────────────────────────
    const grouped: Record<string, string[]> = {};
    for (const c of visibleCommands) {
      grouped[c.category] ??= [];
      grouped[c.category].push(`\`${c.name}\``);
    }
    const fields = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, cmds]) => ({
        name: `${CAT_EMOJI[cat] ?? "📌"} ${cat} (${cmds.length})`,
        value: cmds.sort().join(" "),
      }));
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: "Mourn — Commands",
          description: [
            `Prefix: \`${ctx.prefix}\` · Total: **${visibleCommands.length}** commands`,
            `Use \`${ctx.prefix}help <command>\` for details on a specific command.`,
          ].join("\n"),
          fields,
          page: "Help",
        }),
      ],
    });
  },
};
