import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { distube, hasDjPermission } from "../../features/music.js";

export const command: HybridCommand = {
  name: "skip",
  aliases: ["s"],
  description: "Skip the current song or jump to a position in queue.",
  category: "music",
  guildOnly: true,
  usage: "skip [position]",
  examples: ["skip", "skip 3"],
  options: [{ name: "position", description: "Queue position to skip to", type: ApplicationCommandOptionType.Number, required: false }],
  async execute(ctx) {
    if (!ctx.guild || !ctx.member) return;
    if (!await hasDjPermission(ctx.guild.id, ctx.member)) {
      return ctx.reply({ embeds: [errorEmbed("you need the dj role.")] });
    }
    const queue = distube.getQueue(ctx.guild);
    if (!queue) return ctx.reply({ embeds: [errorEmbed("nothing is playing.")] });
    const pos = ctx.getNumber("position") ?? 1;
    if (pos > 1) {
      try { await distube.jump(ctx.guild, pos - 1); }
      catch { return ctx.reply({ embeds: [errorEmbed("invalid queue position.")] }); }
    } else {
      await distube.skip(ctx.guild).catch(() => distube.stop(ctx.guild!));
    }
    return ctx.reply({ embeds: [successEmbed("skipped.")] });
  },
};
