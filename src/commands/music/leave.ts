import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "leave",
  aliases: ["disconnect", "dc"],
  description: "Leave the voice channel.",
  category: "music",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) return ctx.reply({ embeds: [errorEmbed("you need the dj role.")] });
    const queue = distube.getQueue(ctx.guild);
    if (queue) await distube.stop(ctx.guild);
    await distube.voices.get(ctx.guild)?.leave();
    return ctx.reply({ embeds: [successEmbed("left the voice channel.")] });
  },
};
