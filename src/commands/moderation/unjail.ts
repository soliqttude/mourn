import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "unjail",
  aliases: ["uj", "release", "free"],
  description: "Remove the jail role from a member.",
  usage: "unjail [user] [reason]",
  examples: ["unjail Rule violation"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to unjail", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const settings = await getGuildSettings(guild.id);
    if (!settings.jailRole)
      return ctx.reply({ embeds: [errorEmbed("No jail role configured.")] });
    const jailRole = guild.roles.cache.get(settings.jailRole);
    if (!jailRole) return ctx.reply({ embeds: [errorEmbed("The configured jail role no longer exists.")] });
    const target = await ctx.getMember("user");
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    if (!target.roles.cache.has(jailRole.id))
      return ctx.reply({ embeds: [errorEmbed("That member is not jailed.")] });
    const reason = ctx.getString("reason") ?? "Released from jail";
    try {
      await target.roles.remove(jailRole, reason);
      return ctx.reply({ embeds: [successEmbed(`Released **${target.user.tag}** from jail.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to unjail. Check my role hierarchy.")] });
    }
  },
};
