import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { modEmbed, errorEmbed } from "../../lib/embeds.js";
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
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason") ?? "no reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("user not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you can't ban yourself.")] });
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) return ctx.reply({ embeds: [errorEmbed("i can't ban that user.")] });
    try {
      await guild.members.ban(target.id, { reason: `${ctx.user.tag}: ${reason}` });
      const caseId = await logCase(guild.id, target.id, ctx.user.id, "ban", reason);
      return ctx.reply({
        embeds: [modEmbed({ action: "banned", target, moderator: ctx.user, reason, caseId })],
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
