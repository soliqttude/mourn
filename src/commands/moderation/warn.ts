import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { modEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "warn",
  description: "Warn a member.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to warn", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason", true);
    if (!target) return;
    if (!reason) return ctx.reply({ embeds: [errorEmbed("reason is required.")] });
    await db.insert(warnings).values({ guildId: guild.id, userId: target.id, moderatorId: ctx.user.id, reason });
    const caseId = await logCase(guild.id, target.id, ctx.user.id, "warn", reason);
    target.send(`you were warned in **${guild.name}**: ${reason}`).catch(() => {});
    return ctx.reply({
      embeds: [modEmbed({ action: "warned", target, moderator: ctx.user, reason, caseId })],
    });
  },
};
