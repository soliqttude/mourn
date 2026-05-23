import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "seek",
  description: "Seek to a position in the current song.",
  category: "music",
  guildOnly: true,
  usage: "seek [time e.g. 1:30 or 90]",
  examples: ["seek 1:30", "seek 90"],
  options: [{ name: "time", description: "Time (e.g. 1:30 or 90 seconds)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) return ctx.reply({ embeds: [errorEmbed("you need the dj role.")] });
    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("nothing is playing.")] });
    const timeStr = ctx.getString("time", true)!;
    let seconds = 0;
    if (timeStr.includes(":")) {
      const parts = timeStr.split(":").map(Number);
      if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
      else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      seconds = parseInt(timeStr);
    }
    if (isNaN(seconds) || seconds < 0) return ctx.reply({ embeds: [errorEmbed("invalid time format. use `1:30` or `90`.")] });
    await distube.seek(ctx.guild, seconds);
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return ctx.reply({ embeds: [successEmbed(`seeked to \`${m}:${String(s).padStart(2, "0")}\`.`)] });
  },
};
