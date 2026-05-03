import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "vmute",
  description: "Server-mute a member in voice.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to mute", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    if (!target.voice.channel) return ctx.reply({ embeds: [errorEmbed("Member is not in a voice channel.")] });
    await target.voice.setMute(true, reason);
    const caseId = await logCase(ctx.guild.id, target.id, ctx.user.id, "vmute", reason);
    return ctx.reply({ embeds: [successEmbed(`Voice-muted **${target.user.tag}** — ${reason}\nCase #${caseId}`)] });
  },
};
