import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { jailedMemberRoles } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "unjail",
  aliases: ["uj", "release", "free"],
  description: "Remove the jail role from a member.",
  usage: "unjail [user] [reason]",
  examples: ["unjail Rule violation"],
  category: "moderation",
  permission: "mute_members",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to unjail", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const settings = await getGuildSettings(guild.id);
    if (!settings.jailRole)
      return ctx.reply({ embeds: [errorEmbed("No jail **role** configured.")] });
    const jailRole = guild.roles.cache.get(settings.jailRole);
    if (!jailRole) return ctx.reply({ embeds: [errorEmbed("The configured jail **role** no longer exists.")] });
    const target = await ctx.getMember("user");
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    if (!target.roles.cache.has(jailRole.id))
      return ctx.reply({ embeds: [errorEmbed("That **member** is not jailed.")] });
    const reason = ctx.getString("reason") ?? "Released from jail";
    try {
      await target.roles.remove(jailRole, reason);
      const [saved] = await db.select().from(jailedMemberRoles).where(and(eq(jailedMemberRoles.guildId, guild.id), eq(jailedMemberRoles.userId, target.id)));
      if (saved?.roleIds?.length) {
        const botHighest = guild.members.me?.roles.highest.position ?? 0;
        const restore = saved.roleIds.filter(id => {
          const role = guild.roles.cache.get(id);
          return Boolean(role && !role.managed && role.position < botHighest);
        });
        if (restore.length) await target.roles.add(restore, "Restoring roles after jail");
      }
      await db.delete(jailedMemberRoles).where(and(eq(jailedMemberRoles.guildId, guild.id), eq(jailedMemberRoles.userId, target.id)));
      return ctx.reply({ embeds: [successEmbed(`Released **${target.user.tag}** from jail.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to unjail. Check my **role** hierarchy.")] });
    }
  },
};
