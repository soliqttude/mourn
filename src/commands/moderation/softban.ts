import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { modEmbed, errorEmbed } from "../../lib/embeds.js";
import { logCase } from "../../features/modcase.js";
import { cleanError, REASON_DEFAULT } from "../../lib/format.js";

export const command: HybridCommand = {
  name: "softban",
  description: "Ban then immediately unban a member, wiping their recent messages.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to softban", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason") ?? REASON_DEFAULT;
    if (!target) return ctx.reply({ embeds: [errorEmbed("user not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you can't softban yourself.")] });
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) return ctx.reply({ embeds: [errorEmbed("i can't ban that user — they may have a higher role.")] });
    try {
      await guild.bans.create(target.id, { deleteMessageSeconds: 604800, reason });
      await guild.bans.remove(target.id, "softban cleanup");
      const caseId = await logCase(guild.id, target.id, ctx.user.id, "softban", reason);
      return ctx.reply({ embeds: [modEmbed({ action: "softbanned", target, moderator: ctx.user, reason, caseId })] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed(cleanError(err))] });
    }
  },
};
