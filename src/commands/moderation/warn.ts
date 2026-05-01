import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";

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
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason", true);
    if (!target || !ctx.guild) return;
    if (!reason) return ctx.reply({ embeds: [errorEmbed("Reason is required.")] });
    await db.insert(warnings).values({
      guildId: ctx.guild.id,
      userId: target.id,
      moderatorId: ctx.user.id,
      reason,
    });
    target.send(`You were warned in **${ctx.guild.name}** by ${ctx.user.tag}: ${reason}`).catch(() => {});
    return ctx.reply({ embeds: [successEmbed(`Warned **${target.tag}** — ${reason}`)] });
  },
};
