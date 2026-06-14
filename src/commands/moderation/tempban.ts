import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { REASON_DEFAULT } from "../../lib/format.js";
import { parseDuration } from "../../lib/time.js";
import { db } from "../../db/index.js";
import { tempBans } from "../../db/schema.js";
import { buildModDmEmbed } from "../../lib/modDm.js";

export const command: HybridCommand = {
  name: "tempban",
  description: "Temporarily ban a user.",
  category: "moderation",
  aliases: ["tban"],
  permission: "ban_members",
  guildOnly: true,
  options: [
    { name: "user",     description: "User to ban",                            type: ApplicationCommandOptionType.User,   required: true  },
    { name: "duration", description: "Duration (e.g. 1h, 30m, 1d)",           type: ApplicationCommandOptionType.String, required: true  },
    { name: "reason",   description: "Reason",                                 type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const dur    = ctx.getString("duration", true) ?? ctx.args[1];
    const reason = ctx.getString("reason") ?? REASON_DEFAULT;
    if (!target) return ctx.reply({ embeds: [errorEmbed("**User** not found.")] });
    if (!dur)    return ctx.reply({ embeds: [errorEmbed("Please provide a **duration** (e.g. 1h, 30m, 1d).")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't tempban yourself.")] });
    const existingBan = await guild.bans.fetch(target.id).catch(() => null);
    if (existingBan) return ctx.reply({ embeds: [errorEmbed("That **user** is already banned.")] });
    const ms = parseDuration(dur);
    if (!ms) return ctx.reply({ embeds: [errorEmbed("Invalid **duration**. Use e.g. `10m`, `1h`, `7d`.")] });
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) return ctx.reply({ embeds: [errorEmbed("I can't ban that **user** — they may have a higher **role**.")] });
    const dmEmbed = buildModDmEmbed({ action: "temporarily banned", guild, moderator: ctx.user, reason, extra: `Duration: **${dur}**` });
    const dmSent = await target.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false);
    try {
      await guild.members.ban(target.id, { reason: `[Tempban ${dur}] ${reason} | by ${ctx.user.tag}` });
      await db.insert(tempBans).values({ guildId: guild.id, userId: target.id, moderatorId: ctx.user.id, reason, unbanAt: new Date(Date.now() + ms) });
      return ctx.reply({ content: dmSent ? "👍" : "👍 — couldn't DM member" });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
