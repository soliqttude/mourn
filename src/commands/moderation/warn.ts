import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { REASON_DEFAULT } from "../../lib/format.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "warn",
  description: "Warn a server member.",
  category: "moderation",
  aliases: ["warning"],
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to warn", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason for warning", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason") ?? REASON_DEFAULT;
    if (!target) return ctx.reply({ embeds: [errorEmbed("**User** not found.")] });
    if (target.bot) return ctx.reply({ embeds: [errorEmbed("You can't warn a bot.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't warn yourself.")] });
    await db.insert(warnings).values({
      guildId: guild.id,
      userId: target.id,
      moderatorId: ctx.user.id,
      reason,
    });
    const dmSent = await target.send(
      `You have received a **warning** in **${guild.name}**.\n**Reason:** ${reason}`
    ).then(() => true).catch(() => false);
    return ctx.reply({ content: dmSent ? "👍" : "👍 - Couldn't DM member" });
  },
};
