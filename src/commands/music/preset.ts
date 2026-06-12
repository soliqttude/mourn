import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed, brandEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

// mourn-style named presets mapped to DisTube filter names
const PRESETS: Record<string, string[]> = {
  soft:       ["normalizer"],
  "8d":       ["8d"],
  chipmunk:   ["nightcore"],
  boost:      ["bassboost", "treble"],
  vaporwave:  ["vaporwave"],
  vibrato:    ["vibrato"],
  piano:      ["treble", "normalizer"],
  metal:      ["surrounding", "pulsator"],
  flat:       [],
  karaoke:    ["karaoke"],
  nightcore:  ["nightcore"],
};

export const command: HybridCommand = {
  name: "preset",
  aliases: ["presets"],
  description: "Apply a named audio preset to the current queue.",
  usage: "preset <soft|8d|chipmunk|boost|vaporwave|vibrato|piano|metal|flat|karaoke|nightcore|active>",
  examples: ["preset nightcore", "preset boost", "preset flat", "preset active"],
  category: "music",
  guildOnly: true,
  options: [{
    name: "name",
    description: "Preset name",
    type: ApplicationCommandOptionType.String,
    required: true,
    choices: [
      ...Object.keys(PRESETS).map(p => ({ name: p, value: p })),
      { name: "active", value: "active" },
    ],
  }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();

    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("Nothing is playing.")] });

    if (name === "active") {
      const active = queue.filters.names.length ? queue.filters.names.join(", ") : "none";
      return ctx.reply({ embeds: [brandEmbed({ description: `**active preset/filters:** ${active}` })] });
    }

    if (!(name in PRESETS)) {
      return ctx.reply({ embeds: [errorEmbed(`unknown preset. available: ${Object.keys(PRESETS).join(", ")}`)] });
    }

    if (!await hasDjPermission(ctx.guild.id, ctx.member)) {
      return ctx.reply({ embeds: [errorEmbed("You need the DJ **role** to change presets.")] });
    }

    // flat = clear all
    if (name === "flat") {
      queue.filters.clear();
      return ctx.reply({ embeds: [successEmbed("**Filters** cleared (flat/neutral EQ).")]});
    }

    queue.filters.clear();
    const filters = PRESETS[name]!;
    for (const f of filters) {
      if (f && !queue.filters.has(f as any)) queue.filters.add(f as any);
    }
    return ctx.reply({ embeds: [successEmbed(`preset **${name}** applied.`)] });
  },
};
