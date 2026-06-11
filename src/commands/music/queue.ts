import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed, brandEmbed } from "../../lib/embeds.js";
import { distube, formatTime } from "../../features/music.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "queue",
  aliases: ["q"],
  description: "View, remove, or move tracks in the queue.",
  usage: "queue [remove <position>|move <from> <to>]",
  examples: ["queue", "queue remove 3", "queue move 2 5"],
  category: "music",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "view | remove | move (blank = view)", type: ApplicationCommandOptionType.String, required: false },
    { name: "position", description: "Track position (for remove/move)", type: ApplicationCommandOptionType.Number, required: false },
    { name: "new_position", description: "New position (for move)", type: ApplicationCommandOptionType.Number, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const queue = distube.getQueue(ctx.guild);
    if (!queue || queue.songs.length === 0) return ctx.reply({ embeds: [errorEmbed("The queue is empty.")] });

    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();

    if (sub === "remove") {
      const pos = (ctx.getNumber("position") ?? parseInt(ctx.args[1] ?? "")) ;
      if (isNaN(pos) || pos < 1) return ctx.reply({ embeds: [errorEmbed("Provide a valid position number (1 = currently playing).")] });
      if (pos >= queue.songs.length) return ctx.reply({ embeds: [errorEmbed(`position out of range. queue has ${queue.songs.length} songs.`)] });
      const removed = queue.songs[pos];
      queue.songs.splice(pos, 1);
      return ctx.reply({ embeds: [successEmbed(`removed **${removed?.name ?? "track"}** from the queue.`)] });
    }

    if (sub === "move") {
      const from = ctx.getNumber("position") ?? parseInt(ctx.args[1] ?? "");
      const to = ctx.getNumber("new_position") ?? parseInt(ctx.args[2] ?? "");
      if (isNaN(from) || isNaN(to) || from < 1 || to < 1) return ctx.reply({ embeds: [errorEmbed("Provide valid from and to positions.")] });
      if (from >= queue.songs.length || to >= queue.songs.length) return ctx.reply({ embeds: [errorEmbed("Position out of range.")] });
      const [song] = queue.songs.splice(from, 1);
      queue.songs.splice(to, 0, song!);
      return ctx.reply({ embeds: [successEmbed(`moved **${song?.name ?? "track"}** from position **${from}** to **${to}**.`)] });
    }

    // Default: view queue
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
