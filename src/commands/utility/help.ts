import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { commands, findCommand } from "../../handlers/registry.js";
import { config } from "../../config.js";

// ── Category labels ───────────────────────────────────────────────────────────

export const CAT_LABEL: Record<string, string> = {
  anime:          "Anime",
  animedeveloper: "Developer",
  config:         "Config",
  custom:         "Custom",
  customgiveaway: "Giveaway",
  developer:      "Developer",
  economy:        "Economy",
  fun:            "Fun",
  giveaway:       "Giveaway",
  image:          "Image",
  lastfm:         "Last.fm",
  levels:         "Levels",
  moderation:     "Moderation",
  music:          "Music",
  roleplay:       "Roleplay",
  settings:       "Settings",
  social:         "Social",
  sticker:        "Sticker",
  tags:           "Tags",
  thread:         "Thread",
  utility:        "Utility",
  voicemaster:    "Voice",
  webhook:        "Webhook",
};

const CMDS_PER_PAGE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function catCommandCount(cat: string): number {
  return [...commands.values()].filter((c) => !c.ownerOnly && c.category === cat).length;
}

// ── Single command embed ──────────────────────────────────────────────────────

export function buildCommandEmbed(
  c: HybridCommand,
  prefix: string,
  clientUser?: { username: string; displayAvatarURL(): string } | null,
): EmbedBuilder {
  const usage    = (c as any).usage    as string | undefined;
  const examples = (c as any).examples as string[] | undefined;

  const eb = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle(c.name)
    .setDescription(c.description);

  if (clientUser) {
    eb.setAuthor({ name: clientUser.username, iconURL: clientUser.displayAvatarURL() });
  }

  const mainFields: { name: string; value: string; inline: boolean }[] = [
    { name: "usage", value: `\`${prefix}${usage ?? c.name}\``, inline: false },
  ];
  if (examples?.[0]) {
    mainFields.push({ name: "example", value: `\`${prefix}${examples[0]}\``, inline: false });
  }
  eb.addFields(mainFields);

  const meta: { name: string; value: string; inline: boolean }[] = [];
  if (c.category) {
    meta.push({ name: "category", value: CAT_LABEL[c.category] ?? c.category, inline: true });
  }
  if ((c as any).permission && (c as any).permission !== "everyone") {
    meta.push({ name: "permission", value: (c as any).permission, inline: true });
  }
  if (c.aliases?.length) {
    meta.push({ name: "aliases", value: c.aliases.map((a) => `\`${a}\``).join("  "), inline: false });
  }
  if (meta.length) eb.addFields(meta);

  eb.setFooter({ text: "mourn" });
  return eb;
}

// ── Category page embed ───────────────────────────────────────────────────────

export function buildPagedCategoryEmbed(
  catIndex: number,
  sortedCategories: string[],
  prefix: string,
  cmdPage = 0,
  clientUser?: { username: string; displayAvatarURL(): string } | null,
) {
  const total    = sortedCategories.length;
  const catIdx   = Math.max(0, Math.min(catIndex, total - 1));
  const category = sortedCategories[catIdx]!;

  const cmds = [...commands.values()]
    .filter((c) => c.category === category && !c.ownerOnly)
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalCmdPages = Math.max(1, Math.ceil(cmds.length / CMDS_PER_PAGE));
  const pgIdx    = Math.max(0, Math.min(cmdPage, totalCmdPages - 1));
  const pageCmds = cmds.slice(pgIdx * CMDS_PER_PAGE, (pgIdx + 1) * CMDS_PER_PAGE);

  const lines = pageCmds.map((c) => `\`${c.name}\`  ${c.description}`);

  const label      = CAT_LABEL[category] ?? category;
  const pageInfo   = totalCmdPages > 1 ? `  ·  page ${pgIdx + 1}/${totalCmdPages}` : "";

  const eb = new EmbedBuilder()
    .setColor(config.brandColor)
    .setTitle(label)
    .setDescription(lines.join("\n"))
    .addFields([
      { name: "\u200b", value: `\`${prefix}help <command>\`  for details${pageInfo}`, inline: false },
    ])
    .setFooter({ text: `mourn  ·  ${cmds.length} commands` });

  if (clientUser) {
    eb.setAuthor({ name: clientUser.username, iconURL: clientUser.displayAvatarURL() });
  }

  // Row 1: nav buttons
  const btns: ButtonBuilder[] = [
    new ButtonBuilder()
      .setCustomId(`help:pg:${catIdx - 1}:0`)
      .setLabel("←")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(catIdx === 0),
    new ButtonBuilder()
      .setCustomId("help:home")
      .setLabel("directory")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`help:pg:${catIdx + 1}:0`)
      .setLabel("→")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(catIdx === total - 1),
  ];

  if (totalCmdPages > 1) {
    btns.splice(
      1, 0,
      new ButtonBuilder()
        .setCustomId(`help:pg:${catIdx}:${pgIdx - 1}`)
        .setLabel("‹ prev page")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pgIdx === 0),
    );
    btns.splice(
      btns.length - 1, 0,
      new ButtonBuilder()
        .setCustomId(`help:pg:${catIdx}:${pgIdx + 1}`)
        .setLabel("next page ›")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pgIdx === totalCmdPages - 1),
    );
  }

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(btns);

  // Row 2: category dropdown so users can jump between categories
  const visibleCats = sortedCategories.filter((c) => c !== "developer" && c !== "animedeveloper");
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help:select")
      .setPlaceholder(`currently viewing: ${label}`)
      .addOptions(
        visibleCats.slice(0, 25).map((cat) => ({
          label: CAT_LABEL[cat] ?? cat,
          value: cat,
          description: `${catCommandCount(cat)} commands`,
          default: cat === category,
        })),
      ),
  );

  return { embed: eb, row: new ActionRowBuilder<ButtonBuilder>().addComponents(btns), rows: [navRow, selectRow] };
}

// ── Category embed (by name) ──────────────────────────────────────────────────

export function buildCategoryEmbed(
  category: string,
  prefix: string,
  clientUser?: { username: string; displayAvatarURL(): string } | null,
) {
  const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
  const categories  = [...new Set(visibleCmds.map((c) => c.category))].sort();
  const idx = categories.indexOf(category);
  return buildPagedCategoryEmbed(idx === -1 ? 0 : idx, categories, prefix, 0, clientUser);
}

// ── Help home ─────────────────────────────────────────────────────────────────

export function buildHelpHome(
  totalCmds: number,
  categories: string[],
  prefix: string,
  clientUser?: { username: string; displayAvatarURL(): string } | null,
) {
  const visibleCats = categories.filter((c) => c !== "owner" && c !== "developer" && c !== "animedeveloper");
  const support = config.supportServer;

  const descLines = [
    `**${totalCmds}** commands  ·  **${visibleCats.length}** categories`,
    `\`${prefix}help <command>\`  for details`,
  ];
  if (support) descLines.push("", support);

  const eb = new EmbedBuilder()
    .setColor(config.brandColor)
    .setDescription(descLines.join("\n"))
    .setFooter({ text: `mourn  ·  prefix: ${prefix}` });

  if (clientUser) {
    eb.setAuthor({ name: clientUser.username, iconURL: clientUser.displayAvatarURL() });
    eb.setThumbnail(clientUser.displayAvatarURL());
  }

  // Single dropdown — clean and premium
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("help:select")
    .setPlaceholder("browse a category")
    .addOptions(
      visibleCats.slice(0, 25).map((cat) => ({
        label: CAT_LABEL[cat] ?? cat,
        value: cat,
        description: `${catCommandCount(cat)} commands`,
      })),
    );

  const rows = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
  ];

  return { embed: eb, rows };
}

// ── Command ───────────────────────────────────────────────────────────────────

export const command: HybridCommand = {
  name: "help",
  aliases: ["h", "commands", "cmds"],
  description: "Browse commands by category or look up a specific command.",
  usage: "help [command]",
  examples: ["help ban"],
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
    const target     = ctx.getString("command") ?? ctx.args[0];
    const clientUser = ctx.client.user ?? null;

    if (target) {
      const c = findCommand(target);
      if (!c || c.ownerOnly) return ctx.reply({ embeds: [errorEmbed(`no command found: \`${target}\``)] });
      return ctx.reply({ embeds: [buildCommandEmbed(c, ctx.prefix, clientUser)] });
    }

    const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
    const categories  = [...new Set(visibleCmds.map((c) => c.category))].sort();
    const { embed, rows } = buildHelpHome(visibleCmds.length, categories, ctx.prefix, clientUser);
    return ctx.reply({ embeds: [embed], components: rows as any[] });
  },
};
