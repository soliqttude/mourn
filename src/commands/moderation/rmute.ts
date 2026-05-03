import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "rmute",
  description: "Prevent a user from adding reactions.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to reaction-mute", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    await ctx.guild.channels.cache
      .filter(c => c.isTextBased())
      .forEach(async (ch) => {
        await (ch as any).permissionOverwrites.edit(target.id, { AddReactions: false }).catch(() => {});
      });
    const caseId = await logCase(ctx.guild.id, target.id, ctx.user.id, "rmute", reason);
    return ctx.reply({ embeds: [successEmbed(`Reaction-muted **${target.user.tag}** — ${reason}\nCase #${caseId}`)] });
  },
};
