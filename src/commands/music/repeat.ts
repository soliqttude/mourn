import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";
import { RepeatMode } from "distube";

export const command: HybridCommand = {
  name: "repeat",
  aliases: ["loop"],
  description: "Set repeat mode: off, song, or queue.",
  category: "music",
  guildOnly: true,
  usage: "repeat [off|song|queue]",
  options: [{ name: "mode", description: "off | song | queue", type: ApplicationCommandOptionType.String, required: false, choices: [{ name: "off", value: "off" }, { name: "song", value: "song" }, { name: "queue", value: "queue" }] }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) return ctx.reply({ embeds: [errorEmbed("You need the dj **role**.")] });
    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("Nothing is playing.")] });
    const mode = ctx.getString("mode") ?? "off";
    const modeMap: Record<string, RepeatMode> = { off: RepeatMode.DISABLED, song: RepeatMode.SONG, queue: RepeatMode.QUEUE };
    const rm = modeMap[mode] ?? RepeatMode.DISABLED;
    queue.setRepeatMode(rm);
    const labels = { [RepeatMode.DISABLED]: "off", [RepeatMode.SONG]: "song", [RepeatMode.QUEUE]: "queue" };
    return ctx.reply({ embeds: [successEmbed(`repeat mode set to **${labels[rm]}**.`)] });
  },
};
