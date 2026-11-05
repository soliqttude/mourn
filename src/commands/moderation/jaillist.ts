import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getGuildSettings } from "../../db/settings.js";
import { errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "jaillist", description: "List members currently assigned the configured jail role.", category: "moderation", permission: "manage_messages", guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const settings = await getGuildSettings(ctx.guild.id);
    if (!settings.jailRole) return ctx.reply({ embeds: [errorEmbed("No jail role is configured.")] });
    const role = ctx.guild.roles.cache.get(settings.jailRole);
    if (!role) return ctx.reply({ embeds: [errorEmbed("The configured jail role no longer exists.")] });
    await ctx.defer(true);
    const members = await ctx.guild.members.fetch();
    const jailed = members.filter(member => member.roles.cache.has(role.id));
    const lines = jailed.map(member => "<@" + member.id + "> — " + member.user.tag).slice(0, 40);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x8b1e2d).setTitle("Jailed members (" + jailed.size + ")").setDescription(lines.join("\n") || "No members are currently jailed.")] });
  },
};