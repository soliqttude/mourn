import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "deafen",
  aliases: ["deaf", "dv"],
  description: "Server-deafen a member in voice.",
  usage: "deafen [user] [reason]",
  examples: ["deafen Rule violation"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to deafen", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    if (!target.voice.channel) return ctx.reply({ embeds: [errorEmbed("**Member** is not in a voice **channel**.")] });
    await target.voice.setDeaf(true, reason);
    return ctx.reply({ embeds: [successEmbed(`Deafened **${target.user.tag}** — ${reason}`)] });
  },
};
