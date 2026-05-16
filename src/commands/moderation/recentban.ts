import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { PermissionFlagsBits } from "discord.js";

export const command: HybridCommand = {
  name: "recentban",
  aliases: ["banrecent"],
  description: "Ban all members who joined within the last N minutes. Use during raids.",
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  usage: "recentban (minutes) [reason]",
  examples: ["recentban 5", "recentban 10 raid cleanup"],
  options: [
    { name: "minutes", description: "Ban members who joined within this many minutes", type: ApplicationCommandOptionType.Number, required: true },
    { name: "reason", description: "Ban reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return ctx.reply({ embeds: [errorEmbed("i need **ban members** permission.")] });
    }

    const minutes = ctx.getNumber("minutes", true);
    if (!minutes || minutes < 1 || minutes > 1440) {
      return ctx.reply({ embeds: [errorEmbed("minutes must be between 1 and 1440.")] });
    }

    const reason = ctx.getString("reason") ?? "raid cleanup — recentban";
    const cutoff = Date.now() - minutes * 60 * 1000;

    await ctx.defer();

    await guild.members.fetch().catch(() => null);
    const targets = [...guild.members.cache.values()].filter(
      (m) => !m.user.bot && !m.permissions.has(PermissionFlagsBits.Administrator) &&
        m.joinedTimestamp !== null && m.joinedTimestamp >= cutoff &&
        m.bannable
    );

    if (!targets.length) {
      return ctx.reply({ embeds: [errorEmbed(`no members found who joined in the last ${minutes} minute(s).`)] });
    }

    let banned = 0;
    for (const member of targets) {
      await guild.members.ban(member.id, { reason: `${ctx.user.tag}: ${reason}` }).catch(() => {});
      banned++;
    }

    return ctx.reply({
      embeds: [successEmbed(`banned **${banned}** member(s) who joined in the last ${minutes} minute(s).\nreason: ${reason}`, "moderation")],
    });
  },
};
