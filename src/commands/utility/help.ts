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
import { config } from "../../config.js";

export const CAT_EMOJI: Record<string, string> = {
  fun:         "🎉",
  moderation:  "🛡️",
  settings:    "⚙️",
  utility:     "🔧",
  levels:      "⭐",
  giveaway:    "🎁",
  tags:        "🏷️",
  voicemaster: "🎤",
  custom:      "🌙",
  social:      "👥",
};

export const CAT_LABEL: Record<string, string> = {
  fun:         "Fun",
  moderation:  "Moderation",
  settings:    "Settings",
  utility:     "Utility",
  levels:      "Levels",
  giveaway:    "Giveaway",
  tags:        "Tags",
  voicemaster: "Voice",
  custom:      "Custom",
  social:      "Social",
};

const CMDS_PER_PAGE = 10;

export function buildCommandEmbed(
  c: HybridCommand,
  prefix: string,
  clientUser?: { username: string; displayAvatarURL(): string } | null,
  ownerName?: string,
): EmbedBuilder {
  const usage    = (c as any).usage    as string | undefined;
  const examples = (c as any).examples as string[] | undefined;
  const sub = (s: string) => ownerName ? s.replace(/\{owner\}/g, ownerName) : s;
  const syntaxLine  = `Syntax:  ${prefix}${sub(usage ?? c.name)}`;
  const exampleLine = `Example: ${prefix}${sub(examples?.[0] ?? c.name)}`;
  const eb = new EmbedBuilder()
    .setTitle(`Command: ${c.name}`)
    .setDescription(`${c.description}\n\n\`\`\`\n${syntaxLine}\n${exampleLine}\n\`\`\``);
  if (clientUser) {
    eb.setAuthor({ name: `${clientUser.username} help`, iconURL: clientUser.displayAvatarURL() });
  }
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
  return eb;
}

export function buildPagedCategoryEmbed(catIndex: number, sortedCategories: string[], prefix: string, cmdPage = 0) {
  const total  = sortedCategories.length;
  const catIdx = Math.max(0, Math.min(catIndex, total - 1));
  const category = sortedCategories[catIdx]!;
  const cmds = [...commands.values()].filter((c) => c.category === category && !c.ownerOnly).sort((a, b) => a.name.localeCompare(b.name));
  const totalCmdPages = Math.max(1, Math.ceil(cmds.length / CMDS_PER_PAGE));
  const pgIdx = Math.max(0, Math.min(cmdPage, totalCmdPages - 1));
  const pageCmds = cmds.slice(pgIdx * CMDS_PER_PAGE, (pgIdx + 1) * CMDS_PER_PAGE);
  const maxLen = Math.max(...pageCmds.map((c) => c.name.length), 4);
  const lines = pageCmds.map((c) => {
    const pad  = " ".repeat(maxLen - c.name.length + 3);
    const desc = c.description.length > 45 ? c.description.slice(0, 42) + "…" : c.description;
    return `${c.name}${pad}${desc}`;
  });
  const label      = CAT_LABEL[category] ?? category;
  const catCounter = `${catIdx + 1}/${total}`;
  const cmdCounter = totalCmdPages > 1 ? ` · cmds ${pgIdx + 1}/${totalCmdPages}` : "";
  const description = `**bleed help • ${label.toLowerCase()} (${catCounter}${cmdCounter})**\n` + `\`${prefix}help <command>\` for details\n\n` + "```\n" + lines.join("\n") + "\n```";
  const safeDesc = description.length > 4000 ? description.slice(0, 3997) + "…" : description;
  const embed = brandEmbed({ description: safeDesc });
  const btns: ButtonBuilder[] = [];
  btns.push(new ButtonBuilder().setCustomId(`help:pg:${catIdx - 1}:0`).setLabel("←").setStyle(ButtonStyle.Secondary).setDisabled(catIdx === 0));
  if (totalCmdPages > 1) btns.push(new ButtonBuilder().setCustomId(`help:pg:${catIdx}:${pgIdx - 1}`).setLabel("‹").setStyle(ButtonStyle.Secondary).setDisabled(pgIdx === 0));
  btns.push(new ButtonBuilder().setCustomId("help:home").setLabel("Home").setStyle(ButtonStyle.Secondary));
  if (totalCmdPages > 1) btns.push(new ButtonBuilder().setCustomId(`help:pg:${catIdx}:${pgIdx + 1}`).setLabel("›").setStyle(ButtonStyle.Secondary).setDisabled(pgIdx === totalCmdPages - 1));
  btns.push(new ButtonBuilder().setCustomId(`help:pg:${catIdx + 1}:0`).setLabel("→").setStyle(ButtonStyle.Secondary).setDisabled(catIdx === total - 1));
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btns);
  return { embed, row };
}

export function buildCategoryEmbed(category: string, prefix: string) {
  const visibleCmds = [...commands.values()].filter((c) => !c.ownerOnly);
  const categories  = [...new Set(visibleCmds.map((c) => c.category))].sort();
  const idx = categories.indexOf(category);
  return buildPagedCategoryEmbed(idx === -1 ? 0 : idx, categories, prefix, 0);
}

export function buildHelpHome(totalCmds: number, categories: string[], prefix: string) {
  const visibleCats = categories.filter((c) => c !== "owner");
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < visibleCats.length; i += 5) {
    const chunk = visibleCats.slice(i, i + 5);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      chunk.map((cat) => new ButtonBuilder().setCustomId(`help:cat:${cat}`).setLabel(`${CAT_EMOJI[cat] ?? "📌"} ${CAT_LABEL[cat] ?? cat}`).setStyle(ButtonStyle.Secondary)),
    );
    rows.push(row);
  }
  const embed = brandEmbed({
    description: [`**${totalCmds}** commands · **${visibleCats.length}** categories`, ``, `pick a category below, or use \`${prefix}help <command>\` for command details.`].join("\n"),
  });
  return { embed, rows };
}

export const command: HybridCommand = {
  name: "help",
  aliases: ["h", "commands", "cmds"],
  description: "Browse commands by category or look up a specific command.",
  usage: "help [command]",
  examples: ["help ban"],
  category: "utility",
  options: [
    { name: "command", description: "Look up a specific command", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const target = ctx.getString("command") ?? ctx.args[0];

    if (target) {
      const c = findCommand(target);
      if (!c || c.ownerOnly) return ctx.reply({ embeds: [errorEmbed(`no command found: \`${target}\``)] });
      const clientUser = ctx.client.user ?? null;
      let ownerName: string | undefined;
      if (ctx.guild) {
        try { const owner = await ctx.guild.fetchOwner(); ownerName = owner.user.username; } catch { ownerName = undefined; }
      }
      return ctx.reply({ embeds: [buildCommandEmbed(c, ctx.prefix, clientUser, ownerName)] });
    }

    // No args — send plain text like Bleed
    const clientId = ctx.client.user!.id;
    const website = (config as any).websiteUrl as string | undefined;
    const support = config.supportServer;
    const parts: string[] = [];
    if (website) parts.push(`<${website}>`);
    if (support) parts.push(`join the discord server @ <${support}>`);
    const msg = parts.length
      ? `<@${clientId}>: ${parts.join(", ")}`
      : `<@${clientId}>: no help page configured yet — use \`${ctx.prefix}help <command>\` for command info.`;
    return ctx.reply({ content: msg });
  },
};
