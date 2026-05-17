import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "strip",
  aliases: ["striprole", "removerole"],
  description: "Remove all assignable roles from a member.",
  usage: "strip [user] [reason]",
  examples: ["strip Rule violation"],
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to strip roles from", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getMember("user");
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    const me = guild.members.me;
    const removable = target.roles.cache.filter(
      (r) => r.id !== guild.id && (!me || me.roles.highest.comparePositionTo(r) > 0)
    );
    if (!removable.size) return ctx.reply({ embeds: [errorEmbed("No removable roles found.")] });
    try {
      await target.roles.remove(removable, reason);
      return ctx.reply({ embeds: [successEmbed(`Stripped **${removable.size}** role(s) from **${target.user.tag}**.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to strip roles. Check my permissions.")] });
    }
  },
};
