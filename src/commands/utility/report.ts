import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed } from "../../lib/embeds.js";
import { getGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { reports } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "report",
  description: "Report a member to the server moderators.",
  category: "utility",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to report", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason for the report", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason", true) ?? ctx.rawArgs.split(/\s+/).slice(1).join(" ");
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You cannot report yourself.")] });
    if (target.bot) return ctx.reply({ embeds: [errorEmbed("You cannot report a bot.")] });
    const settings = await getGuildSettings(guild.id);
    if (!settings.reportChannel)
      return ctx.reply({ embeds: [errorEmbed("No report channel configured. Ask an admin to use `/setreport`.")] });
    const ch = guild.channels.cache.get(settings.reportChannel) as any;
    if (!ch) return ctx.reply({ embeds: [errorEmbed("The report channel no longer exists.")] });
    await db.insert(reports).values({ guildId: guild.id, reporterId: ctx.user.id, targetId: target.id, reason });
    await ch.send({
      embeds: [brandEmbed({
        title: "📋 New Report",
        fields: [
          { name: "Reported User", value: `<@${target.id}> (${target.tag})`, inline: true },
          { name: "Reporter", value: `<@${ctx.user.id}>`, inline: true },
          { name: "Reason", value: reason },
        ],
        page: "Reports",
      })],
    });
    return ctx.reply({ embeds: [successEmbed("Your report has been submitted to the moderators.")], ephemeral: true } as any);
  },
};
