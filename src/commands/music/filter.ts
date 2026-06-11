import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed, brandEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

const FILTERS = ["bassboost", "8d", "vaporwave", "nightcore", "phaser", "tremolo", "vibrato", "reverse", "treble", "normalizer", "surrounding", "pulsator", "subboost", "karaoke", "flanger", "gate", "haas", "mcompand"] as const;

export const command: HybridCommand = {
  name: "filter",
  aliases: ["filters"],
  description: "Apply or clear an audio filter.",
  category: "music",
  guildOnly: true,
  usage: "filter [name|off]",
  examples: ["filter bassboost", "filter 8d", "filter off"],
  options: [{
    name: "name",
    description: "Filter name or 'off' to clear all",
    type: ApplicationCommandOptionType.String,
    required: false,
    choices: [{ name: "off (clear)", value: "off" }, ...FILTERS.map(f => ({ name: f, value: f }))],
  }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("Nothing is playing.")] });
    const name = ctx.getString("name");
    if (!name) {
      const active = queue.filters.names.length ? queue.filters.names.join(", ") : "none";
      return ctx.reply({ embeds: [brandEmbed({ description: `**available filters:** ${FILTERS.join(", ")}\n**active:** ${active}` })] });
    }
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) return ctx.reply({ embeds: [errorEmbed("You need the dj **role**.")] });
    if (name === "off") {
      queue.filters.clear();
      return ctx.reply({ embeds: [successEmbed("All **filters** cleared.")] });
    }
    if (!FILTERS.includes(name as any)) return ctx.reply({ embeds: [errorEmbed(`unknown filter. use: ${FILTERS.join(", ")}`)] });
    if (queue.filters.has(name as any)) {
      queue.filters.remove(name as any);
      return ctx.reply({ embeds: [successEmbed(`filter **${name}** removed.`)] });
    }
    queue.filters.add(name as any);
    return ctx.reply({ embeds: [successEmbed(`filter **${name}** applied.`)] });
  },
};
