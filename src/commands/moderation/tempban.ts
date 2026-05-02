import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { db } from "../../db/index.js";
import { tempBans } from "../../db/schema.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "tempban",
  description: "Temporarily ban a member.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to ban", type: ApplicationCommandOptionType.User, required: true },
    { name: "duration", description: "Duration e.g. 1h, 1d, 7d", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const durStr = ctx.getString("duration", true)!;
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("User not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't ban yourself.")] });
    const ms = parseDuration(durStr);
    if (!ms) return ctx.reply({ embeds: [errorEmbed("Invalid duration. Example: 1h, 6h, 1d, 7d")] });
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) return ctx.reply({ embeds: [errorEmbed("I can't ban that user.")] });
    const unbanAt = new Date(Date.now() + ms);
    try {
      await guild.members.ban(target.id, { reason: `[TEMPBAN ${durStr}] ${ctx.user.tag}: ${reason}` });
      await db.insert(tempBans).values({ guildId: guild.id, userId: target.id, moderatorId: ctx.user.id, reason, unbanAt });
      const caseId = await logCase(guild.id, target.id, ctx.user.id, "tempban", reason, durStr);
      return ctx.reply({ embeds: [successEmbed(`Temp-banned **${target.tag}** for **${durStr}** — ${reason}\nCase #${caseId}`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
