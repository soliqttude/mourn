import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "stripall",
  aliases: ["stripallroles", "massstrip"],
  description: "Remove all roles from a member.",
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to strip", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    const roles = target.roles.cache.filter(r => r.id !== ctx.guild!.id);
    await target.roles.remove(roles, reason);
    const caseId = await logCase(ctx.guild.id, target.id, ctx.user.id, "stripall", reason);
    return ctx.reply({ embeds: [successEmbed(`Stripped all roles from **${target.user.tag}** — ${reason}\nCase #${caseId}`)] });
  },
};
