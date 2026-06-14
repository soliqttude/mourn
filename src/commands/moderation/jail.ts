import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "jail",
  aliases: ["jl", "imprison"],
  description: "Assign the jail role to a member.",
  usage: "jail [user] [reason]",
  examples: ["jail Rule violation"],
  category: "moderation",
  permission: "mute_members",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to jail", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const settings = await getGuildSettings(guild.id);
    if (!settings.jailRole)
      return ctx.reply({ embeds: [errorEmbed("No jail **role** configured. Use `/setjailrole` first.")] });
    const jailRole = guild.roles.cache.get(settings.jailRole);
    if (!jailRole) return ctx.reply({ embeds: [errorEmbed("The configured jail **role** no longer exists.")] });
    const target = await ctx.getMember("user");
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    if (target.roles.cache.has(jailRole.id))
      return ctx.reply({ embeds: [errorEmbed("That **member** is already jailed.")] });
    try {
      await target.roles.add(jailRole, reason);
      return ctx.reply({ embeds: [successEmbed(`Jailed **${target.user.tag}**.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to jail. Check my **role** hierarchy.")] });
    }
  },
};
