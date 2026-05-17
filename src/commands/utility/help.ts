import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
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

const CMDS_PER_PAGE = 10;

// ── Single command embed — matches bleed style from image ─────────────────────
export function buildCommandEmbed(
  c: HybridCommand,
  prefix: string,
  clientUser?: { username: string; displayAvatarURL(): string } | null,
  ownerName?: string,
): EmbedBuilder {
  const usage    = (c as any).usage    as string | undefined;
  const examples = (c as any).examples as string[] | undefined;

  // Replace {owner} placeholder with actual server owner's username
  const sub = (s: string) => ownerName ? s.replace(/\{owner\}/g, ownerName) : s;

  const syntaxLine  = `Syntax:  ${prefix}${sub(usage ?? c.name)}`;
  const exampleLine = `Example: ${prefix}${sub(examples?.[0] ?? c.name)}`;

  const description = `${c.description}\n\n\`\`\`\n${syntaxLine}\n${exampleLine}\n\`\`\``;

  const eb = new EmbedBuilder()
    .setDescription(description)
    .setTitle(`Command: ${c.name}`)
    .setTimestamp();

  if (clientUser) {
    eb.setAuthor({
      name: `${clientUser.username} help`,
      iconURL: clientUser.displayAvatarURL(),
    });
  }

  if (c.aliases?.length || (c as any).permission || c.category) {
    const fields: { name: string; value: string; inline: boolean }[] = [];
    if (c.category) {
      fields.push({ name: "category", value: `${CAT_EMOJI[c.category] ?? "📌"} ${CAT_LABEL[c.category] ?? c.category}`, inline: true });
    }
    if ((c as any).permission && (c as any).permission !== "everyone") {
      fields.push({ name: "permission", value: (c as any).permission, inline: true });
    }
    if (c.aliases?.length) {
      fields.push({ name: "aliases", value: c.aliases.map((a) => `\`${a}\``).join(", "), inline: false });
    }
    if (fields.length) eb.addFields(fields);
  }

  return eb;
}

// ── Paged category embed ──────────────────────────────────────────────────────
export function buildPagedCategoryEmbed(
  catIndex: number,
  sortedCategories: string[],
  prefix: string,
  cmdPage = 0,
) {
  const total = sortedCategories.length;
  const catIdx = Math.max(0, Math.min(catIndex, total - 1));
  const category = sortedCategories[catIdx]!;

  const cmds = [...commands.values()]
    .filter((c) => c.category === category && !c.ownerOnly)
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalCmdPages = Math.max(1, Math.ceil(cmds.length / CMDS_PER_PAGE));
  const pgIdx = Math.max(0, Math.min(cmdPage, totalCmdPages - 1));
  const pageCmds = cmds.slice(pgIdx * CMDS_PER_PAGE, (pgIdx + 1) * CMDS_PER_PAGE);

  const maxLen = Math.max(...pageCmds.map((c) => c.name.length), 4);
  const lines = pageCmds.map((c) => {
    const pad = " ".repeat(maxLen - c.name.length + 3);
    const desc = c.description.length > 45 ? c.description.slice(0, 42) + "…" : c.description;
    return `${c.name}${pad}${desc}`;
  });

  const label = CAT_LABEL[category] ?? category;
  const catCounter = `${catIdx + 1}/${total}`;
  const cmdCounter = totalCmdPages > 1 ? ` · cmds ${pgIdx + 1}/${totalCmdPages}` : "";

  const description =
    `**Bleed Help • ${label} (${catCounter}${cmdCounter})**\n` +
    `\`${prefix}help <command>\` for details\n\n` +
    "```\n" + lines.join("\n") + "\n```";

  const safeDesc = description.length > 4000
    ? description.slice(0, 3997) + "…"
    : description;

  const embed = brandEmbed({ description: safeDesc });

  const btns: ButtonBuilder[] = [];

  btns.push(
    new ButtonBuilder()
      .setCustomId(`help:pg:${catIdx - 1}:0`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(catIdx === 0),
  );

  if (totalCmdPages > 1) {
    btns.push(
      new ButtonBuilder()
        .setCustomId(`help:pg:${catIdx}:${pgIdx - 1}`)
        .setLabel("←")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pgIdx === 0),
    );
  }

  btns.push(
    new ButtonBuilder()
      .setCustomId("help:home")
      .setLabel("Home")
      .setStyle(ButtonStyle.Secondary),
  );

  if (totalCmdPages > 1) {
    btns.push(
      new ButtonBuilder()
        .setCustomId(`help:pg:${catIdx}:${pgIdx + 1}`)
        .setLabel("→")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pgIdx === totalCmdPages - 1),
    );
  }

  btns.push(
    new ButtonBuilder()
      .setCustomId(`help:pg:${catIdx + 1}:0`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(catIdx === total - 1),
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btns);
  return { embed, row };
}

// ── Category embed (back-compat with help:cat:NAME buttons) ──────────────────
export function buildCategoryEmbed(category: string, prefix: string) {
  const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
  const categories = [...new Set(visibleCmds.map((c) => c.category))].sort();
  const idx = categories.indexOf(category);
  return buildPagedCategoryEmbed(idx === -1 ? 0 : idx, categories, prefix, 0);
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
  usage: "category [command]",
  examples: ["category"],
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

    // ── Single command lookup — bleed style ───────────────────────────────────
    if (target) {
      const c = findCommand(target);
      if (!c || c.ownerOnly)
        return ctx.reply({ embeds: [errorEmbed(`no command found: \`${target}\``)] });

      const clientUser = ctx.client.user ?? null;

      // Fetch server owner's username to use in examples
      let ownerName: string | undefined;
      if (ctx.guild) {
        try {
          const owner = await ctx.guild.fetchOwner();
          ownerName = owner.user.username;
        } catch {
          ownerName = undefined;
        }
      }

      const embed = buildCommandEmbed(c, ctx.prefix, clientUser, ownerName);
      return ctx.reply({ embeds: [embed] });
    }

    // ── Category paginator ────────────────────────────────────────────────────
    const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
    const categories = [...new Set(visibleCmds.map((c) => c.category))].sort();
    const { embed, row } = buildPagedCategoryEmbed(0, categories, ctx.prefix, 0);
    return ctx.reply({ embeds: [embed], components: [row as any] });
  },
};
