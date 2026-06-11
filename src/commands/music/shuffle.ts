import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "shuffle",
  description: "Shuffle the current queue.",
  category: "music",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) return ctx.reply({ embeds: [errorEmbed("You need the dj **role**.")] });
    const queue = distube.getQueue(ctx.guild);
    if (!queue || queue.songs.length < 2) return ctx.reply({ embeds: [errorEmbed("Not enough songs in the queue to shuffle.")] });
    await queue.shuffle();
    return ctx.reply({ embeds: [successEmbed(`shuffled ${queue.songs.length} songs.`)] });
  },
};
