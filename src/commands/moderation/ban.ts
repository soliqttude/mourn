import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { modEmbed, errorEmbed } from "../../lib/embeds.js";
import { cleanError, REASON_DEFAULT } from "../../lib/format.js";

export const command: HybridCommand = {
  name: "ban",
  aliases: ["b"],
  description: "Ban a member from the server.",
  usage: "ban [user] [reason]",
  examples: ["ban Rule violation"],
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
    const reason = ctx.getString("reason") ?? REASON_DEFAULT;
    if (!target) return ctx.reply({ embeds: [errorEmbed("**User** not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't ban yourself.")] });
    const existingBan = await guild.bans.fetch(target.id).catch(() => null);
    if (existingBan) return ctx.reply({ embeds: [errorEmbed("That **user** is already banned.")] });
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) return ctx.reply({ embeds: [errorEmbed("I can't ban that **user** — they may have a higher **role**.")] });
    try {
      await guild.members.ban(target.id, { reason: `${ctx.user.tag}: ${reason}` });
      return ctx.reply({
        embeds: [modEmbed({ action: "banned", target, moderator: ctx.user, reason })],
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed(cleanError(err))] });
    }
  },
};
