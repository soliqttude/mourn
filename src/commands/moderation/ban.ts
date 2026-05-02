import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "ban",
  description: "Ban a member from the server.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to ban", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target || !ctx.guild) return ctx.reply({ embeds: [errorEmbed("User not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't ban yourself.")] });
    const member = await ctx.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) return ctx.reply({ embeds: [errorEmbed("I can't ban that user.")] });
    try {
      await ctx.guild.members.ban(target.id, { reason: `${ctx.user.tag}: ${reason}` });
      const caseId = await logCase(ctx.guild.id, target.id, ctx.user.id, "ban", reason);
      return ctx.reply({ embeds: [successEmbed(`Banned **${target.tag}** — ${reason}\nCase #${caseId}`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
