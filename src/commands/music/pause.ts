import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "pause",
  description: "Pause the current song.",
  category: "music",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) return ctx.reply({ embeds: [errorEmbed("you need the dj role.")] });
    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("nothing is playing.")] });
    if (queue.paused) return ctx.reply({ embeds: [errorEmbed("already paused.")] });
    queue.pause();
    return ctx.reply({ embeds: [successEmbed("paused.")] });
  },
};
