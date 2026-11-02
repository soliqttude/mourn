import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { REASON_DEFAULT } from "../../lib/format.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";
import { buildModDmEmbed } from "../../lib/modDm.js";

const MAX_REASON_LENGTH = 512;

export const command: HybridCommand = {
  name: "warn",
  description: "Warn a server member.",
  category: "moderation",
  aliases: ["warning"],
  permission: "kick_members",
  guildOnly: true,
  options: [
    { name: "user", description: "User to warn", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason for warning", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const target = await ctx.getUser("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**User** not found.")] });
    if (target.bot) return ctx.reply({ embeds: [errorEmbed("You can't warn a bot.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't warn yourself.")] });

    const reason = ctx.getString("reason") ?? REASON_DEFAULT;
    if (reason.length > MAX_REASON_LENGTH) {
      return ctx.reply({ embeds: [errorEmbed(`Reason must be ${MAX_REASON_LENGTH} characters or fewer.`)] });
    }

    // Target must be in the server
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      return ctx.reply({ embeds: [errorEmbed("That user isn't in this server.")] });
    }

    // Role hierarchy check
    if (target.id === guild.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("You can't warn the server owner.")] });
    }
    if (ctx.user.id !== guild.ownerId) {
      const executorMember = await guild.members.fetch(ctx.user.id).catch(() => null);
      if (!executorMember) {
        return ctx.reply({ embeds: [errorEmbed("Couldn't verify your permissions.")] });
      }
      if (targetMember.roles.highest.position >= executorMember.roles.highest.position) {
        return ctx.reply({ embeds: [errorEmbed("You can't warn someone with an equal or higher role.")] });
      }
    }

    // Save the warning (same insert as the original file)
    try {
      await db
        .insert(warnings)
        .values({ guildId: guild.id, userId: target.id, moderatorId: ctx.user.id, reason });
    } catch (err) {
      console.error("[warn] DB insert failed:", err);
      return ctx.reply({ embeds: [errorEmbed("Failed to save the warning. Try again later.")] });
    }

    // DM the member
    const dmEmbed = buildModDmEmbed({ action: "warned", guild, moderator: ctx.user, reason });
    const dmSent = await target.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false);

    return ctx.reply({
      content: dmSent
        ? `👍 Warned **${target.username}**`
        : `👍 Warned **${target.username}** — couldn't DM member`,
    });
  },
};
