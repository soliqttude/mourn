import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { distube, formatTime } from "../../features/music.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "queue",
  aliases: ["q"],
  description: "Show the current music queue.",
  category: "music",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const queue = distube.getQueue(ctx.guild);
    if (!queue || queue.songs.length === 0) return ctx.reply({ embeds: [errorEmbed("the queue is empty.")] });
    const songs = queue.songs.slice(0, 15);
    const lines = songs.map((s, i) => {
      const dur = s.formattedDuration ?? "live";
      if (i === 0) return `**[now] ${s.name}** \`${dur}\` — <@${s.user?.id ?? "?"}>`;
      return `\`${i}.\` ${s.name} \`${dur}\` — <@${s.user?.id ?? "?"}>`;
    });
    const totalSecs = queue.songs.reduce((a, s) => a + (s.duration ?? 0), 0);
    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle(`Queue — ${queue.songs.length} song${queue.songs.length === 1 ? "" : "s"}`)
      .setDescription(lines.join("\n") + (queue.songs.length > 15 ? `\n…and ${queue.songs.length - 15} more` : ""))
      .setFooter({ text: `total duration: ${formatTime(totalSecs)} • volume: ${queue.volume}%` });
    return ctx.reply({ embeds: [embed] });
  },
};
