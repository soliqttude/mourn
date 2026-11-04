import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { jailedMemberRoles } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { renderTemplate } from "../../lib/template.js";

export const command: HybridCommand = {
  name: "jail",
  aliases: ["jl", "imprison"],
  description: "Assign the jail role to a member.",
  usage: "jail [user] [reason]",
  examples: ["jail Rule violation"],
  category: "moderation",
  permission: "mute_members",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to jail", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const settings = await getGuildSettings(guild.id);
    if (!settings.jailRole)
      return ctx.reply({ embeds: [errorEmbed("No jail **role** configured. Use `/setjailrole` first.")] });
    const jailRole = guild.roles.cache.get(settings.jailRole);
    if (!jailRole) return ctx.reply({ embeds: [errorEmbed("The configured jail **role** no longer exists.")] });
    const target = await ctx.getMember("user");
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    if (target.roles.cache.has(jailRole.id))
      return ctx.reply({ embeds: [errorEmbed("That **member** is already jailed.")] });
    try {
      if (settings.jailRemoveRoles) {
        const botHighest = guild.members.me?.roles.highest.position ?? 0;
        const roleIds = target.roles.cache.filter(role => role.id !== guild.id && !role.managed && role.position < botHighest && role.id !== jailRole.id).map(role => role.id);
        await db.insert(jailedMemberRoles).values({ guildId: guild.id, userId: target.id, roleIds })
          .onConflictDoUpdate({ target: [jailedMemberRoles.guildId, jailedMemberRoles.userId], set: { roleIds } });
      }
      await target.roles.add(jailRole, reason);
      if (settings.jailRemoveRoles) {
        const [saved] = await db.select().from(jailedMemberRoles).where(and(eq(jailedMemberRoles.guildId, guild.id), eq(jailedMemberRoles.userId, target.id)));
        if (saved?.roleIds?.length) await target.roles.remove(saved.roleIds, reason);
      }
      if (settings.jailChannel) {
        const channel = guild.channels.cache.get(settings.jailChannel);
        if (channel?.isTextBased()) await (channel as any).send({ content: `<@${target.id}> was jailed by <@${ctx.user.id}>. Reason: ${reason}`, allowedMentions: { users: [target.id, ctx.user.id] } }).catch(() => {});
      }
      if (settings.jailMessage) {
        const message = renderTemplate(settings.jailMessage, { member: target });
        await target.send({ content: message, allowedMentions: { parse: [] } }).catch(() => {});
      }
      return ctx.reply({ embeds: [successEmbed(`Jailed **${target.user.tag}**.`)] });
    } catch {
      await db.delete(jailedMemberRoles).where(and(eq(jailedMemberRoles.guildId, guild.id), eq(jailedMemberRoles.userId, target.id))).catch(() => {});
      return ctx.reply({ embeds: [errorEmbed("Failed to jail. Check my **role** hierarchy.")] });
    }
  },
};
