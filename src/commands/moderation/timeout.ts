import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { REASON_DEFAULT } from "../../lib/format.js";
import { parseDuration } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "timeout",
  aliases: ["mute"],
  description: "Timeout a member.",
  usage: "timeout [user] [duration] [reason]",
  examples: ["timeout @user 10m Rule violation"],
  category: "moderation",
  permission: "moderate_members",
  guildOnly: true,
  options: [
    { name: "user", description: "User to timeout", type: ApplicationCommandOptionType.User, required: true },
    { name: "duration", description: "Duration (e.g. 10m, 1h, 1d)", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getMember("user", true);
    const dur = ctx.getString("duration", true);
    const reason = ctx.getString("reason") ?? REASON_DEFAULT;
    if (!target || !dur) return;
    const ms = parseDuration(dur);
    if (!ms || ms > 28 * 24 * 60 * 60 * 1000) return ctx.reply({ embeds: [errorEmbed("Invalid **duration** — max 28 days.")] });
    if (!target.moderatable) return ctx.reply({ embeds: [errorEmbed("I can't timeout that **user**.")] });
    const dmSent = await target.user.send(
      `You have been **timed out** in **${guild.name}** for ${dur}.\n**Reason:** ${reason}`
    ).then(() => true).catch(() => false);
    try {
      await target.timeout(ms, `${ctx.user.tag}: ${reason}`);
      return ctx.reply({ content: dmSent ? "👍" : "👍 - Couldn't DM member" });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
