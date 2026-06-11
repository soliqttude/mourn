import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "resume",
  aliases: ["res"],
  description: "Resume the paused song.",
  category: "music",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) return ctx.reply({ embeds: [errorEmbed("You need the dj **role**.")] });
    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("Nothing is playing.")] });
    if (!queue.paused) return ctx.reply({ embeds: [errorEmbed("Music is not paused.")] });
    queue.resume();
    return ctx.reply({ embeds: [successEmbed("Resumed.")] });
  },
};
